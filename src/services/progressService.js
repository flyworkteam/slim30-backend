const { pool } = require('../config/db');

const totalDays = 30;

async function ensureDefaultUserExists(userId) {
  await pool.execute(
    `INSERT INTO users (id, email, name, language, timezone, created_at, updated_at)
     VALUES (?, NULL, ?, 'tr', 'Europe/Istanbul', NOW(), NOW())
     ON DUPLICATE KEY UPDATE id = id`,
    [userId, `User ${userId}`],
  );
}

function buildDaysFromRows(rows) {
  const byDay = new Map(rows.map((row) => [Number(row.day_number), row]));

  return Array.from({ length: totalDays }, (_, index) => {
    const dayNumber = index + 1;
    const row = byDay.get(dayNumber);
    return {
      day: dayNumber,
      completed: row ? Boolean(row.completed) : false,
      completedAt: row?.completed_at || null,
    };
  });
}

async function getProgressDays(userId) {
  await ensureDefaultUserExists(userId);
  const [rows] = await pool.execute(
    `SELECT day_number, completed, completed_at
     FROM user_workout_progress
     WHERE user_id = ?`,
    [userId],
  );

  return buildDaysFromRows(rows);
}

async function upsertProgressDay(userId, dayNumber, completed) {
  await ensureDefaultUserExists(userId);
  const completedAt = completed ? new Date() : null;

  await pool.execute(
    `INSERT INTO user_workout_progress (user_id, day_number, completed, completed_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       completed = VALUES(completed),
       completed_at = CASE
         WHEN VALUES(completed) = 0 THEN NULL
         WHEN completed = 1 THEN completed_at
         ELSE VALUES(completed_at)
       END,
       updated_at = NOW()`,
    [userId, dayNumber, completed ? 1 : 0, completedAt],
  );

  const [rows] = await pool.execute(
    `SELECT day_number, completed, completed_at
     FROM user_workout_progress
     WHERE user_id = ? AND day_number = ?
     LIMIT 1`,
    [userId, dayNumber],
  );

  const row = rows[0];
  return {
    day: Number(row.day_number),
    completed: Boolean(row.completed),
    completedAt: row.completed_at || null,
  };
}

async function getProgressSummary(userId) {
  await ensureDefaultUserExists(userId);
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS completed_count
     FROM user_workout_progress
     WHERE user_id = ? AND completed = 1`,
    [userId],
  );

  const completedDays = Number(rows[0]?.completed_count || 0);
  const remainingDays = Math.max(totalDays - completedDays, 0);
  const completionRate = Number(((completedDays / totalDays) * 100).toFixed(2));

  return {
    totalDays,
    completedDays,
    remainingDays,
    completionRate,
  };
}

module.exports = {
  totalDays,
  getProgressDays,
  upsertProgressDay,
  getProgressSummary,
};
