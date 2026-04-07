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

async function getExerciseProgressByDay(userId, dayNumber) {
  await ensureDefaultUserExists(userId);
  const [rows] = await pool.execute(
    `SELECT day_number, exercise_index, exercise_title, completed, seconds_spent, completed_at
     FROM user_exercise_progress
     WHERE user_id = ? AND day_number = ?
     ORDER BY exercise_index ASC`,
    [userId, dayNumber],
  );

  return rows.map((row) => ({
    day: Number(row.day_number),
    exercise: Number(row.exercise_index),
    exerciseTitle: row.exercise_title || null,
    completed: Boolean(row.completed),
    secondsSpent: Number(row.seconds_spent || 0),
    completedAt: row.completed_at || null,
  }));
}

async function upsertExerciseProgressDay(
  userId,
  dayNumber,
  exerciseIndex,
  { completed, secondsSpent, exerciseTitle },
) {
  await ensureDefaultUserExists(userId);
  const completedAt = completed ? new Date() : null;

  await pool.execute(
    `INSERT INTO user_exercise_progress (
       user_id,
       day_number,
       exercise_index,
       exercise_title,
       completed,
       seconds_spent,
       completed_at,
       created_at,
       updated_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       exercise_title = COALESCE(VALUES(exercise_title), exercise_title),
       completed = VALUES(completed),
       seconds_spent = CASE
         WHEN VALUES(seconds_spent) > seconds_spent THEN VALUES(seconds_spent)
         ELSE seconds_spent
       END,
       completed_at = CASE
         WHEN VALUES(completed) = 0 THEN NULL
         WHEN completed = 1 THEN completed_at
         ELSE VALUES(completed_at)
       END,
       updated_at = NOW()`,
    [
      userId,
      dayNumber,
      exerciseIndex,
      exerciseTitle,
      completed ? 1 : 0,
      secondsSpent,
      completedAt,
    ],
  );

  const [rows] = await pool.execute(
    `SELECT day_number, exercise_index, exercise_title, completed, seconds_spent, completed_at
     FROM user_exercise_progress
     WHERE user_id = ? AND day_number = ? AND exercise_index = ?
     LIMIT 1`,
    [userId, dayNumber, exerciseIndex],
  );

  const row = rows[0];
  return {
    day: Number(row.day_number),
    exercise: Number(row.exercise_index),
    exerciseTitle: row.exercise_title || null,
    completed: Boolean(row.completed),
    secondsSpent: Number(row.seconds_spent || 0),
    completedAt: row.completed_at || null,
  };
}

async function getProgressSummary(userId) {
  await ensureDefaultUserExists(userId);
  const [dayRows] = await pool.execute(
    `SELECT COUNT(*) AS completed_count
     FROM user_workout_progress
     WHERE user_id = ? AND completed = 1`,
    [userId],
  );

  const [exerciseRows] = await pool.execute(
    `SELECT
       COUNT(*) AS completed_exercise_count,
       COALESCE(SUM(seconds_spent), 0) AS total_seconds
     FROM user_exercise_progress
     WHERE user_id = ? AND completed = 1`,
    [userId],
  );

  const completedDays = Number(dayRows[0]?.completed_count || 0);
  const completedExercises = Number(exerciseRows[0]?.completed_exercise_count || 0);
  const totalWorkoutSeconds = Number(exerciseRows[0]?.total_seconds || 0);
  const totalWorkoutMinutes = Math.round(totalWorkoutSeconds / 60);
  const remainingDays = Math.max(totalDays - completedDays, 0);
  const completionRate = Number(((completedDays / totalDays) * 100).toFixed(2));

  return {
    totalDays,
    completedDays,
    remainingDays,
    completionRate,
    successRate: completionRate,
    totalCompletedExercises: completedExercises,
    movementCount: completedExercises,
    totalWorkoutSeconds,
    totalWorkoutMinutes,
    caloriesBurned: completedDays * 140,
    muscleGainKg: null,
    waistChangeCm: null,
    bodyFatChangePercent: null,
    weightLostKg: null,
    restingHeartRateBpm: null,
    hydrationPercent: null,
    sleepHours: null,
  };
}

module.exports = {
  totalDays,
  getProgressDays,
  upsertProgressDay,
  getExerciseProgressByDay,
  upsertExerciseProgressDay,
  getProgressSummary,
};
