const { pool } = require('../config/db');
const AppError = require('../utils/appError');

async function ensureUserExists(userId) {
  const [rows] = await pool.execute('SELECT id FROM users WHERE id = ? LIMIT 1', [userId]);
  if (rows.length === 0) {
    throw new AppError('User not found', 404);
  }
}

async function ensureDefaultSettings(userId) {
  await ensureUserExists(userId);
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
     ON DUPLICATE KEY UPDATE user_id = user_id`,
    [userId],
  );
}

async function getSettings(userId) {
  await ensureDefaultSettings(userId);
  const [rows] = await pool.execute(
    `SELECT daily_reminder_enabled, workout_reminder_enabled, progress_summary_enabled, reminder_hour
     FROM notification_settings
     WHERE user_id = ?
     LIMIT 1`,
    [userId],
  );

  const row = rows[0];
  return {
    dailyReminderEnabled: Boolean(row.daily_reminder_enabled),
    workoutReminderEnabled: Boolean(row.workout_reminder_enabled),
    progressSummaryEnabled: Boolean(row.progress_summary_enabled),
    reminderHour: Number(row.reminder_hour),
  };
}

async function updateSettings(userId, settings) {
  await ensureDefaultSettings(userId);
  await pool.execute(
    `UPDATE notification_settings
     SET daily_reminder_enabled = ?,
         workout_reminder_enabled = ?,
         progress_summary_enabled = ?,
         reminder_hour = ?,
         updated_at = NOW()
     WHERE user_id = ?`,
    [
      settings.dailyReminderEnabled ? 1 : 0,
      settings.workoutReminderEnabled ? 1 : 0,
      settings.progressSummaryEnabled ? 1 : 0,
      settings.reminderHour,
      userId,
    ],
  );

  return getSettings(userId);
}

async function getNotifications(userId, limit = 50) {
  await ensureUserExists(userId);
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 50;
  const [rows] = await pool.execute(
    `SELECT id, title, body, icon_name, icon_bg_hex, is_read, created_at
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, safeLimit],
  );

  return rows.map((row) => ({
    id: Number(row.id),
    title: row.title,
    body: row.body,
    iconName: row.icon_name,
    iconBgHex: row.icon_bg_hex,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at,
  }));
}

async function createNotification(userId, payload) {
  await ensureUserExists(userId);
  await pool.execute(
    `INSERT INTO notifications (user_id, title, body, icon_name, icon_bg_hex, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, 0, NOW())`,
    [
      userId,
      payload.title,
      payload.body,
      payload.iconName || 'notification',
      payload.iconBgHex || '#6ACBFF',
    ],
  );
}

async function markRead(userId, notificationId) {
  const [result] = await pool.execute(
    `UPDATE notifications
     SET is_read = 1
     WHERE user_id = ? AND id = ?`,
    [userId, notificationId],
  );
  return result.affectedRows > 0;
}

async function markAllRead(userId) {
  await pool.execute(
    `UPDATE notifications
     SET is_read = 1
     WHERE user_id = ? AND is_read = 0`,
    [userId],
  );
}

async function deleteNotification(userId, notificationId) {
  const [result] = await pool.execute(
    `DELETE FROM notifications
      WHERE user_id = ? AND id = ?`,
    [userId, notificationId],
  );
  return result.affectedRows > 0;
}

async function deleteAllNotifications(userId) {
  const [result] = await pool.execute(
    `DELETE FROM notifications
      WHERE user_id = ?`,
    [userId],
  );
  return Number(result.affectedRows || 0);
}

module.exports = {
  getSettings,
  updateSettings,
  getNotifications,
  createNotification,
  markRead,
  markAllRead,
  deleteNotification,
  deleteAllNotifications,
};
