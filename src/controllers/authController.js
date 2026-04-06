const { pool } = require('../config/db');
const { verifyFirebaseIdToken } = require('../config/firebaseAdmin');
const { signAuthToken } = require('../utils/jwt');
const AppError = require('../utils/appError');

function normalizeOptionalString(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function upsertUserByFirebaseUid(decodedToken) {
  const firebaseUid = normalizeOptionalString(decodedToken?.uid);
  if (!firebaseUid) {
    throw new AppError('Firebase token does not contain uid', 401);
  }

  const email = normalizeOptionalString(decodedToken.email);
  const name = normalizeOptionalString(decodedToken.name);

  const [existingRows] = await pool.execute(
    'SELECT id, is_deleted FROM users WHERE firebase_uid = ? LIMIT 1',
    [firebaseUid],
  );

  if (existingRows.length > 0) {
    const userId = Number(existingRows[0].id);
    if (Number(existingRows[0].is_deleted) === 1) {
      throw new AppError('Account is deleted', 410);
    }

    await pool.execute(
      `UPDATE users
       SET email = COALESCE(?, email),
           name = COALESCE(?, name),
           updated_at = NOW()
       WHERE id = ?`,
      [email, name, userId],
    );
    return { userId, firebaseUid };
  }

  try {
    const [insertResult] = await pool.execute(
      `INSERT INTO users (firebase_uid, email, name, language, timezone, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [firebaseUid, email, name || 'User', 'tr', 'Europe/Istanbul'],
    );

    return {
      userId: Number(insertResult.insertId),
      firebaseUid,
    };
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      const [rows] = await pool.execute(
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
  const [rows] = await pool.execute(
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

async function exchangeFirebaseToken(req, res, next) {
  try {
    const firebaseToken = req.validated?.body?.firebaseToken;
    const decodedToken = await verifyFirebaseIdToken(firebaseToken);
    const { userId, firebaseUid } = await upsertUserByFirebaseUid(decodedToken);
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

module.exports = {
  exchangeFirebaseToken,
};
