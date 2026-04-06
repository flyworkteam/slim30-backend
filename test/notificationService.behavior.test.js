const test = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config();

const {
  getSettings,
  updateSettings,
  getNotifications,
  createNotification,
  markRead,
  markAllRead,
} = require('../src/services/notificationService');
const { pool } = require('../src/config/db');

function isDbConfigured() {
  return Boolean(process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME);
}

const runOrSkip = isDbConfigured() ? test : test.skip;

runOrSkip('notification settings default and update behavior', async () => {
  const userId = 920001;
  await pool.execute(
    `INSERT INTO users (id, email, name, language, timezone, created_at, updated_at)
     VALUES (?, NULL, ?, 'tr', 'Europe/Istanbul', NOW(), NOW())
     ON DUPLICATE KEY UPDATE id = id`,
    [userId, `User ${userId}`],
  );
  await pool.execute('DELETE FROM notification_settings WHERE user_id = ?', [userId]);

  const defaults = await getSettings(userId);
  assert.equal(defaults.dailyReminderEnabled, true);
  assert.equal(defaults.workoutReminderEnabled, true);
  assert.equal(defaults.progressSummaryEnabled, true);
  assert.equal(defaults.reminderHour, 9);

  const updated = await updateSettings(userId, {
    dailyReminderEnabled: false,
    workoutReminderEnabled: true,
    progressSummaryEnabled: false,
    reminderHour: 18,
  });
  assert.equal(updated.dailyReminderEnabled, false);
  assert.equal(updated.workoutReminderEnabled, true);
  assert.equal(updated.progressSummaryEnabled, false);
  assert.equal(updated.reminderHour, 18);

  await pool.execute('DELETE FROM notification_settings WHERE user_id = ?', [userId]);
});

runOrSkip('notification list/read flows work', async () => {
  const userId = 920002;
  await pool.execute(
    `INSERT INTO users (id, email, name, language, timezone, created_at, updated_at)
     VALUES (?, NULL, ?, 'tr', 'Europe/Istanbul', NOW(), NOW())
     ON DUPLICATE KEY UPDATE id = id`,
    [userId, `User ${userId}`],
  );
  await pool.execute('DELETE FROM notifications WHERE user_id = ?', [userId]);

  await createNotification(userId, { title: 'A', body: 'A body' });
  await createNotification(userId, { title: 'B', body: 'B body' });

  const listBefore = await getNotifications(userId, 10);
  assert.equal(listBefore.length, 2);
  assert.equal(listBefore.every((n) => n.isRead === false), true);

  const marked = await markRead(userId, listBefore[0].id);
  assert.equal(marked, true);

  await markAllRead(userId);
  const listAfter = await getNotifications(userId, 10);
  assert.equal(listAfter.every((n) => n.isRead === true), true);

  await pool.execute('DELETE FROM notifications WHERE user_id = ?', [userId]);
});
