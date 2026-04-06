const { pool } = require('../config/db');
const AppError = require('../utils/appError');

function validateProfilePayload(body) {
  const allowedKeys = new Set([
    'email',
    'name',
    'age',
    'gender',
    'height_cm',
    'weight_kg',
    'target_weight_kg',
    'language',
    'timezone',
  ]);

  for (const key of Object.keys(body)) {
    if (!allowedKeys.has(key)) {
      throw new AppError(`Unsupported field: ${key}`, 400);
    }
  }

  if (body.email != null) {
    if (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      throw new AppError('Invalid email format', 400);
    }
  }

  if (body.name != null) {
    if (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 120) {
      throw new AppError('Invalid name', 400);
    }
  }

  if (body.age != null) {
    const age = Number(body.age);
    if (!Number.isFinite(age) || age < 12 || age > 100) {
      throw new AppError('Invalid age', 400);
    }
  }

  if (body.gender != null) {
    const allowed = new Set(['female', 'male', 'unspecified']);
    if (!allowed.has(String(body.gender))) {
      throw new AppError('Invalid gender', 400);
    }
  }

  for (const [key, min, max] of [
    ['height_cm', 100, 250],
    ['weight_kg', 20, 350],
    ['target_weight_kg', 20, 350],
  ]) {
    if (body[key] != null) {
      const value = Number(body[key]);
      if (!Number.isFinite(value) || value < min || value > max) {
        throw new AppError(`Invalid ${key}`, 400);
      }
    }
  }

  if (body.language != null) {
    const language = String(body.language);
    if (!/^[a-z]{2}$/.test(language)) {
      throw new AppError('Invalid language', 400);
    }
  }

  if (body.timezone != null) {
    if (typeof body.timezone !== 'string' || body.timezone.length < 3 || body.timezone.length > 64) {
      throw new AppError('Invalid timezone', 400);
    }
  }
}

async function ensureDefaultUserExists(userId) {
  const [rows] = await pool.execute('SELECT id FROM users WHERE id = ? LIMIT 1', [userId]);
  if (rows.length > 0) {
    return;
  }

  await pool.execute(
    'INSERT INTO users (id, email, name, language, timezone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
    [userId, null, `User ${userId}`, 'tr', 'Europe/Istanbul'],
  );
}

async function getProfile(req, res, next) {
  try {
    const userId = req.userId;
    await ensureDefaultUserExists(userId);

    const [rows] = await pool.execute(
      `SELECT id, email, name, age, gender, height_cm, weight_kg, target_weight_kg,
              language, timezone, avatar_url, created_at, updated_at
       FROM users
       WHERE id = ? AND is_deleted = 0
       LIMIT 1`,
      [userId],
    );

    if (rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: { user: rows[0] },
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const userId = req.userId;
    await ensureDefaultUserExists(userId);
    validateProfilePayload(req.body || {});

    const {
      email,
      name,
      age,
      gender,
      height_cm,
      weight_kg,
      target_weight_kg,
      language,
      timezone,
    } = req.body;

    await pool.execute(
      `UPDATE users
       SET email = COALESCE(?, email),
           name = COALESCE(?, name),
           age = COALESCE(?, age),
           gender = COALESCE(?, gender),
           height_cm = COALESCE(?, height_cm),
           weight_kg = COALESCE(?, weight_kg),
           target_weight_kg = COALESCE(?, target_weight_kg),
           language = COALESCE(?, language),
           timezone = COALESCE(?, timezone),
           updated_at = NOW()
       WHERE id = ? AND is_deleted = 0`,
      [
        email ?? null,
        name ?? null,
        age ?? null,
        gender ?? null,
        height_cm ?? null,
        weight_kg ?? null,
        target_weight_kg ?? null,
        language ?? null,
        timezone ?? null,
        userId,
      ],
    );

    const [rows] = await pool.execute(
      `SELECT id, email, name, age, gender, height_cm, weight_kg, target_weight_kg,
              language, timezone, avatar_url, created_at, updated_at
       FROM users
       WHERE id = ? AND is_deleted = 0
       LIMIT 1`,
      [userId],
    );

    res.json({
      success: true,
      data: { user: rows[0] || null },
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProfile,
  updateProfile,
};
