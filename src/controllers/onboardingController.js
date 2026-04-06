const { pool } = require('../config/db');
const AppError = require('../utils/appError');
const {
  validateQuestionKey,
} = require('../validation/onboardingValidation');

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
  getAnswers,
  upsertAnswers,
  deleteAnswer,
};
