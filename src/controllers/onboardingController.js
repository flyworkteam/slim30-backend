const { pool } = require('../config/db');
const AppError = require('../utils/appError');
const { normalizeLanguageCode } = require('../utils/locale');
const {
  validateQuestionKey,
} = require('../validation/onboardingValidation');

const profileQuestionKeys = new Set([
  'age',
  'gender',
  'height_cm',
  'weight_kg',
  'target_weight_kg',
]);

function parseAnswerValue(raw) {
  if (raw == null) {
    return null;
  }

  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch (error) {
      return raw;
    }
  }

  return raw;
}

function normalizeProfileValue(questionKey, answerValue) {
  if (!profileQuestionKeys.has(questionKey)) {
    return undefined;
  }

  if (questionKey === 'gender') {
    const normalized = typeof answerValue === 'string' ? answerValue.trim() : '';
    const allowed = new Set(['female', 'male', 'unspecified']);
    if (!allowed.has(normalized)) {
      throw new AppError(`Invalid answer_value for ${questionKey}`, 400);
    }
    return normalized;
  }

  const value = Number(answerValue);
  if (!Number.isFinite(value)) {
    throw new AppError(`Invalid answer_value for ${questionKey}`, 400);
  }

  if (questionKey === 'age') {
    if (!Number.isInteger(value) || value < 12 || value > 100) {
      throw new AppError(`Invalid answer_value for ${questionKey}`, 400);
    }
    return value;
  }

  const [min, max] = questionKey === 'height_cm'
    ? [100, 250]
    : [20, 350];

  if (value < min || value > max) {
    throw new AppError(`Invalid answer_value for ${questionKey}`, 400);
  }

  return value;
}

function buildProfileUpdateFromAnswers(answers) {
  const profileUpdate = {};

  for (const answer of answers) {
    const normalized = normalizeProfileValue(
      answer?.questionKey,
      answer?.answerValue,
    );

    if (normalized !== undefined) {
      profileUpdate[answer.questionKey] = normalized;
    }
  }

  return profileUpdate;
}

async function ensureDefaultUserExists(connection, userId, languageCode = 'en') {
  const resolvedLanguage = normalizeLanguageCode(languageCode) || 'en';
  const [rows] = await connection.execute(
    'SELECT id FROM users WHERE id = ? LIMIT 1',
    [userId],
  );

  if (rows.length > 0) {
    return;
  }

  await connection.execute(
    `INSERT INTO users (id, email, name, language, timezone, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [userId, null, `User ${userId}`, resolvedLanguage, 'Europe/Istanbul'],
  );
}

async function syncProfileAnswers(connection, userId, answers, languageCode = 'en') {
  const profileUpdate = buildProfileUpdateFromAnswers(answers);
  if (Object.keys(profileUpdate).length === 0) {
    return;
  }

  await ensureDefaultUserExists(connection, userId, languageCode);
  await connection.execute(
    `UPDATE users
     SET age = COALESCE(?, age),
         gender = COALESCE(?, gender),
         height_cm = COALESCE(?, height_cm),
         weight_kg = COALESCE(?, weight_kg),
         target_weight_kg = COALESCE(?, target_weight_kg),
         updated_at = NOW()
     WHERE id = ? AND is_deleted = 0`,
    [
      profileUpdate.age ?? null,
      profileUpdate.gender ?? null,
      profileUpdate.height_cm ?? null,
      profileUpdate.weight_kg ?? null,
      profileUpdate.target_weight_kg ?? null,
      userId,
    ],
  );
}

async function getAnswers(req, res, next) {
  try {
    const [rows] = await pool.execute(
      `SELECT question_key, answer_value, updated_at
       FROM onboarding_answers
       WHERE user_id = ?
       ORDER BY updated_at DESC`,
      [req.userId],
    );

    const answers = rows.map((row) => ({
      question_key: row.question_key,
      answer_value: parseAnswerValue(row.answer_value),
      updated_at: row.updated_at,
    }));

    res.json({
      success: true,
      data: { answers },
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

async function upsertAnswers(req, res, next) {
  try {
    const answers = req.validated?.body?.answers || [];
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      for (const answer of answers) {
        await connection.execute(
          `INSERT INTO onboarding_answers (user_id, question_key, answer_value, created_at, updated_at)
           VALUES (?, ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE
             answer_value = VALUES(answer_value),
             updated_at = NOW()`,
          [req.userId, answer.questionKey, answer.answerValueSerialized],
        );
      }

      await syncProfileAnswers(connection, req.userId, answers, req.locale);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.json({
      success: true,
      data: { upserted: answers.length },
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteAnswer(req, res, next) {
  try {
    const questionKey = req.validated?.params?.questionKey || validateQuestionKey(req.params.questionKey || '');

    const [result] = await pool.execute(
      `DELETE FROM onboarding_answers
       WHERE user_id = ? AND question_key = ?`,
      [req.userId, questionKey],
    );

    if (result.affectedRows === 0) {
      throw new AppError('Onboarding answer not found', 404);
    }

    res.json({
      success: true,
      data: { deleted: true },
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  buildProfileUpdateFromAnswers,
  getAnswers,
  upsertAnswers,
  deleteAnswer,
};
