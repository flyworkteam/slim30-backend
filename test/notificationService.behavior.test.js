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
  deleteNotification,
  deleteAllNotifications,
} = require('../src/services/notificationService');
const { pool } = require('../src/config/db');
const {
  dispatchScheduledNotifications,
  SCHEDULED_ICON_NAME,
} = require('../src/services/notificationAutomationService');

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

runOrSkip('notification delete flows work', async () => {
  const userId = 920003;
  await pool.execute(
    `INSERT INTO users (id, email, name, language, timezone, created_at, updated_at)
     VALUES (?, NULL, ?, 'tr', 'Europe/Istanbul', NOW(), NOW())
     ON DUPLICATE KEY UPDATE id = id`,
    [userId, `User ${userId}`],
  );
  await pool.execute('DELETE FROM notifications WHERE user_id = ?', [userId]);

  await createNotification(userId, { title: 'A', body: 'A body' });
  await createNotification(userId, { title: 'B', body: 'B body' });

  const before = await getNotifications(userId, 10);
  assert.equal(before.length, 2);

  const deleted = await deleteNotification(userId, before[0].id);
  assert.equal(deleted, true);

  const afterSingle = await getNotifications(userId, 10);
  assert.equal(afterSingle.length, 1);

  const deletedCount = await deleteAllNotifications(userId);
  assert.equal(deletedCount, 1);

  const afterAll = await getNotifications(userId, 10);
  assert.equal(afterAll.length, 0);
});

runOrSkip('scheduled notifications rotate without duplicating the same slot', async () => {
  const userId = 920004;
  await pool.execute(
    `INSERT INTO users (id, email, name, language, timezone, created_at, updated_at)
     VALUES (?, NULL, ?, 'tr', 'Europe/Istanbul', NOW(), NOW())
     ON DUPLICATE KEY UPDATE language = VALUES(language), timezone = VALUES(timezone)`,
    [userId, `User ${userId}`],
  );
  await pool.execute('DELETE FROM notifications WHERE user_id = ?', [userId]);
  await pool.execute('DELETE FROM notification_settings WHERE user_id = ?', [userId]);
  await pool.execute(
    `INSERT INTO notification_settings (
       user_id,
       daily_reminder_enabled,
       workout_reminder_enabled,
       progress_summary_enabled,
       reminder_hour,
       created_at,
       updated_at
     ) VALUES (?, 1, 1, 1, 9, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       daily_reminder_enabled = VALUES(daily_reminder_enabled),
       workout_reminder_enabled = VALUES(workout_reminder_enabled),
       progress_summary_enabled = VALUES(progress_summary_enabled),
       reminder_hour = VALUES(reminder_hour),
       updated_at = NOW()`,
    [userId],
  );

  await dispatchScheduledNotifications(new Date('2026-04-08T06:03:00.000Z'));

  const firstList = await getNotifications(userId, 10);
  assert.equal(firstList.length, 1);
  assert.equal(firstList[0].iconName, SCHEDULED_ICON_NAME);

  await dispatchScheduledNotifications(new Date('2026-04-08T06:10:00.000Z'));
  const afterDuplicateAttempt = await getNotifications(userId, 10);
  assert.equal(afterDuplicateAttempt.length, 1);

  await pool.execute(
    `UPDATE notifications
        SET created_at = DATE_SUB(created_at, INTERVAL 6 HOUR)
      WHERE user_id = ? AND icon_name = ?`,
    [userId, SCHEDULED_ICON_NAME],
  );

  await dispatchScheduledNotifications(new Date('2026-04-08T12:03:00.000Z'));

  const secondList = await getNotifications(userId, 10);
  assert.equal(secondList.length, 2);
  assert.notEqual(secondList[0].body, secondList[1].body);

  await pool.execute('DELETE FROM notifications WHERE user_id = ?', [userId]);
  await pool.execute('DELETE FROM notification_settings WHERE user_id = ?', [userId]);
});
