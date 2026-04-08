const { pool } = require('../config/db');
const AppError = require('../utils/appError');
const { normalizeLanguageCode } = require('../utils/locale');

const defaultTrialHours = 24;

function parseTrialDurationHours() {
  const value = Number.parseInt(String(process.env.TRIAL_DURATION_HOURS || defaultTrialHours), 10);
  if (!Number.isInteger(value) || value < 1 || value > 24 * 30) {
    return defaultTrialHours;
  }
  return value;
}

async function ensureDefaultUserExists(userId, languageCode = 'en') {
  const resolvedLanguage = normalizeLanguageCode(languageCode) || 'en';
  await pool.execute(
    `INSERT INTO users (id, email, name, language, timezone, created_at, updated_at)
     VALUES (?, NULL, ?, ?, 'Europe/Istanbul', NOW(), NOW())
     ON DUPLICATE KEY UPDATE id = id`,
    [userId, `User ${userId}`, resolvedLanguage],
  );
}

function isPremiumActive(user) {
  if (!user.is_premium) {
    return false;
  }

  if (!user.premium_expires_at) {
    return true;
  }

  return new Date(user.premium_expires_at) > new Date();
}

async function getPremiumStatus(userId, languageCode) {
  await ensureDefaultUserExists(userId, languageCode);

  const [rows] = await pool.execute(
    `SELECT is_premium, premium_expires_at, trial_used
     FROM users
     WHERE id = ? AND is_deleted = 0
     LIMIT 1`,
    [userId],
  );

  const user = rows[0];
  if (!user) {
    throw new AppError('User not found', 404);
  }

  let active = isPremiumActive(user);
  if (user.is_premium && !active) {
    await pool.execute(
      'UPDATE users SET is_premium = 0, updated_at = NOW() WHERE id = ?',
      [userId],
    );
    await pool.execute(
      `UPDATE subscriptions
       SET status = 'expired', updated_at = NOW()
       WHERE user_id = ? AND status = 'active' AND expires_at IS NOT NULL AND expires_at <= NOW()`,
      [userId],
    );
  }

  const [subs] = await pool.execute(
    `SELECT plan_type, price, currency, source, status, starts_at, expires_at
     FROM subscriptions
     WHERE user_id = ? AND status = 'active'
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId],
  );

  active = isPremiumActive(user);

  return {
    isPremium: active,
    premiumExpiresAt: user.premium_expires_at,
    trialUsed: Boolean(user.trial_used),
    subscription: subs[0] || null,
  };
}

async function startTrial(userId, languageCode) {
  await ensureDefaultUserExists(userId, languageCode);

  const trialHours = parseTrialDurationHours();
  const startsAt = new Date();
  const expiresAt = new Date(startsAt.getTime() + trialHours * 60 * 60 * 1000);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [updateResult] = await conn.execute(
      `UPDATE users
       SET trial_used = 1,
           is_premium = 1,
           premium_expires_at = ?,
           updated_at = NOW()
       WHERE id = ? AND trial_used = 0`,
      [expiresAt, userId],
    );

    if (updateResult.affectedRows === 0) {
      throw new AppError('Trial already used', 409);
    }

    await conn.execute(
      `INSERT INTO subscriptions (user_id, plan_type, price, currency, source, status, starts_at, expires_at)
       VALUES (?, 'trial', 0, 'TRY', 'trial', 'active', ?, ?)`,
      [userId, startsAt, expiresAt],
    );

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  return getPremiumStatus(userId, languageCode);
}

async function activatePremium(userId, payload, languageCode) {
  await ensureDefaultUserExists(userId, languageCode);

  const startsAt = new Date();
  const expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(
      `INSERT INTO subscriptions (user_id, plan_type, price, currency, external_subscription_id, source, status, starts_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [
        userId,
        payload.planType,
        payload.price,
        payload.currency,
        payload.externalSubscriptionId || null,
        payload.source,
        startsAt,
        expiresAt,
      ],
    );

    await conn.execute(
      `UPDATE users
       SET is_premium = 1,
           premium_expires_at = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [expiresAt, userId],
    );

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  return getPremiumStatus(userId, languageCode);
}

async function processWebhookEvent(event) {
  if (!event || typeof event !== 'object') {
    return;
  }

  const appUserId = event.app_user_id;
  if (!appUserId || typeof appUserId !== 'string') {
    return;
  }

  const [users] = await pool.execute('SELECT id FROM users WHERE firebase_uid = ? LIMIT 1', [appUserId]);
  if (users.length === 0) {
    return;
  }

  const userId = users[0].id;
  const eventType = String(event.type || '').toUpperCase();
  const expiresAt = Number.isFinite(Number(event.expiration_at_ms))
    ? new Date(Number(event.expiration_at_ms))
    : null;

  if (new Set(['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'NON_RENEWING_PURCHASE']).has(eventType)) {
    await pool.execute(
      'UPDATE users SET is_premium = 1, premium_expires_at = ?, updated_at = NOW() WHERE id = ?',
      [expiresAt, userId],
    );

    const externalId = typeof event.original_transaction_id === 'string'
      ? event.original_transaction_id
      : typeof event.transaction_id === 'string'
        ? event.transaction_id
        : null;

    if (externalId) {
      const [updateResult] = await pool.execute(
        `UPDATE subscriptions
         SET status = 'active',
             expires_at = ?,
             updated_at = NOW()
         WHERE external_subscription_id = ?`,
        [expiresAt, externalId],
      );

      if (updateResult.affectedRows === 0) {
        await pool.execute(
          `INSERT INTO subscriptions (user_id, plan_type, price, currency, external_subscription_id, source, status, starts_at, expires_at)
           VALUES (?, ?, 0, 'TRY', ?, 'revenuecat', 'active', NOW(), ?)`,
          [userId, 'revenuecat', externalId, expiresAt],
        );
      }
    }

    return;
  }

  if (new Set(['CANCELLATION', 'EXPIRATION']).has(eventType)) {
    await pool.execute(
      'UPDATE users SET is_premium = 0, updated_at = NOW() WHERE id = ?',
      [userId],
    );
    await pool.execute(
      `UPDATE subscriptions
       SET status = 'expired', updated_at = NOW()
       WHERE user_id = ? AND status = 'active'`,
      [userId],
    );
  }
}

module.exports = {
  getPremiumStatus,
  startTrial,
  activatePremium,
  processWebhookEvent,
};
