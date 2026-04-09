const { executeWithRetry } = require('../config/db');
const { verifyFirebaseIdToken } = require('../config/firebaseAdmin');
const { signAuthToken } = require('../utils/jwt');
const AppError = require('../utils/appError');
const { normalizeLanguageCode } = require('../utils/locale');

function normalizeOptionalString(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalHttpsUrl(value) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch (_) {
    return null;
  }
}

async function upsertUserByFirebaseUid(decodedToken, languageCode = 'en', profileHint = {}) {
  const firebaseUid = normalizeOptionalString(decodedToken?.uid);
  if (!firebaseUid) {
    throw new AppError('Firebase token does not contain uid', 401);
  }

  const resolvedLanguage = normalizeLanguageCode(languageCode) || 'en';
  const hintedEmail = normalizeOptionalString(profileHint.email);
  const hintedName = normalizeOptionalString(profileHint.displayName);
  const hintedPhotoUrl = normalizeOptionalHttpsUrl(profileHint.photoUrl);

  const email = hintedEmail || normalizeOptionalString(decodedToken.email);
  const name = hintedName || normalizeOptionalString(decodedToken.name);
  const avatarUrl = hintedPhotoUrl || normalizeOptionalHttpsUrl(decodedToken.picture);

  const [existingRows] = await executeWithRetry(
    'SELECT id, is_deleted FROM users WHERE firebase_uid = ? LIMIT 1',
    [firebaseUid],
  );

  if (existingRows.length > 0) {
    const userId = Number(existingRows[0].id);
    if (Number(existingRows[0].is_deleted) === 1) {
      throw new AppError('Account is deleted', 410);
    }

    await executeWithRetry(
      `UPDATE users
       SET email = COALESCE(?, email),
           name = CASE WHEN ? IS NOT NULL THEN ? ELSE name END,
           avatar_url = COALESCE(?, avatar_url),
           updated_at = NOW()
       WHERE id = ?`,
      [email, name, name, avatarUrl, userId],
    );
    return { userId, firebaseUid };
  }

  try {
    const [insertResult] = await executeWithRetry(
      `INSERT INTO users (firebase_uid, email, name, language, timezone, avatar_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [firebaseUid, email, name || 'User', resolvedLanguage, 'Europe/Istanbul', avatarUrl],
    );

    return {
      userId: Number(insertResult.insertId),
      firebaseUid,
    };
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      const [rows] = await executeWithRetry(
        'SELECT id, is_deleted FROM users WHERE firebase_uid = ? LIMIT 1',
        [firebaseUid],
      );

      if (rows.length > 0) {
        if (Number(rows[0].is_deleted) === 1) {
          throw new AppError('Account is deleted', 410);
        }

        return { userId: Number(rows[0].id), firebaseUid };
      }
    }

    throw error;
  }
}

async function getUserById(userId) {
  const [rows] = await executeWithRetry(
    `SELECT id, firebase_uid, email, name, age, gender, height_cm, weight_kg,
            target_weight_kg, language, timezone, avatar_url, is_deleted,
            created_at, updated_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId],
  );

  if (rows.length === 0 || rows[0].is_deleted === 1) {
    throw new AppError('User not found', 404);
  }

  const user = { ...rows[0] };
  delete user.is_deleted;
  return user;
}

async function createGuestUser(languageCode = 'en') {
  const resolvedLanguage = normalizeLanguageCode(languageCode) || 'en';
  const [insertResult] = await executeWithRetry(
    `INSERT INTO users (firebase_uid, email, name, language, timezone, avatar_url, created_at, updated_at)
     VALUES (NULL, NULL, ?, ?, ?, NULL, NOW(), NOW())`,
    ['Guest', resolvedLanguage, 'Europe/Istanbul'],
  );

  const userId = Number(insertResult.insertId);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AppError('Guest user could not be created', 500);
  }

  return { userId, firebaseUid: null };
}

async function exchangeFirebaseToken(req, res, next) {
  try {
    const firebaseToken = req.validated?.body?.firebaseToken;
    const profileHint = {
      displayName: req.validated?.body?.displayName ?? null,
      email: req.validated?.body?.email ?? null,
      photoUrl: req.validated?.body?.photoUrl ?? null,
    };
    const decodedToken = await verifyFirebaseIdToken(firebaseToken);
    const { userId, firebaseUid } = await upsertUserByFirebaseUid(decodedToken, req.locale, profileHint);
    const user = await getUserById(userId);
    const token = signAuthToken({ userId, firebaseUid });

    res.json({
      success: true,
      data: {
        token,
        user,
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

async function createGuestSession(req, res, next) {
  try {
    const { userId, firebaseUid } = await createGuestUser(req.locale);
    const user = await getUserById(userId);
    const token = signAuthToken({ userId, firebaseUid });

    res.status(201).json({
      success: true,
      data: {
        token,
        user,
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createGuestSession,
  exchangeFirebaseToken,
};
