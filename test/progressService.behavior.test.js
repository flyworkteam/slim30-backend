const test = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config();

const {
  getProgressDays,
  upsertProgressDay,
  getProgressSummary,
  totalDays,
} = require('../src/services/progressService');
const { pool } = require('../src/config/db');

function isDbConfigured() {
  return Boolean(process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME);
}

const runOrSkip = isDbConfigured() ? test : test.skip;

runOrSkip('progress service returns 30 days and updates summary', async () => {
  const userId = 910001;
  await pool.execute('DELETE FROM user_workout_progress WHERE user_id = ?', [userId]);

  const initialDays = await getProgressDays(userId);
  assert.equal(initialDays.length, totalDays);
  assert.equal(initialDays.every((d) => d.completed === false), true);

  await upsertProgressDay(userId, 1, true);
  await upsertProgressDay(userId, 2, true);

  const summaryAfterComplete = await getProgressSummary(userId);
  assert.equal(summaryAfterComplete.completedDays, 2);
  assert.equal(summaryAfterComplete.remainingDays, 28);

  await upsertProgressDay(userId, 2, false);
  const summaryAfterToggle = await getProgressSummary(userId);
  assert.equal(summaryAfterToggle.completedDays, 1);
  assert.equal(summaryAfterToggle.remainingDays, 29);

  await pool.execute('DELETE FROM user_workout_progress WHERE user_id = ?', [userId]);
});

runOrSkip('progress completed_at remains stable on repeated completed=true', async () => {
  const userId = 910002;
  await pool.execute('DELETE FROM user_workout_progress WHERE user_id = ?', [userId]);

  const first = await upsertProgressDay(userId, 5, true);
  const second = await upsertProgressDay(userId, 5, true);

  assert.equal(first.completed, true);
  assert.equal(second.completed, true);
  assert.ok(first.completedAt);
  assert.ok(second.completedAt);
  assert.equal(String(first.completedAt), String(second.completedAt));

  await upsertProgressDay(userId, 5, false);
  const [rows] = await pool.execute(
    'SELECT completed, completed_at FROM user_workout_progress WHERE user_id = ? AND day_number = ? LIMIT 1',
    [userId, 5],
  );
  assert.equal(Boolean(rows[0].completed), false);
  assert.equal(rows[0].completed_at, null);

  await pool.execute('DELETE FROM user_workout_progress WHERE user_id = ?', [userId]);
});
