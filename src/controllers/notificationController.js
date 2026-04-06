const AppError = require('../utils/appError');
const {
  parseNotificationId,
  validateSettingsPayload,
} = require('../validation/notificationValidation');
const {
  getSettings,
  updateSettings,
  getNotifications,
  createNotification,
  markRead,
  markAllRead,
} = require('../services/notificationService');

async function getNotificationSettings(req, res, next) {
  try {
    const settings = await getSettings(req.userId);
    res.json({
      success: true,
      data: { settings },
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

async function updateNotificationSettings(req, res, next) {
  try {
    const payload = req.validated?.body || validateSettingsPayload(req.body);
    const settings = await updateSettings(req.userId, payload);
    res.json({
      success: true,
      data: { settings },
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

async function listNotifications(req, res, next) {
  try {
    const limit = req.validated?.query?.limit
      || (req.query.limit ? Number.parseInt(String(req.query.limit), 10) : 50);
    const notifications = await getNotifications(req.userId, limit);
    res.json({
      success: true,
      data: { notifications },
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

async function createNotificationForUser(req, res, next) {
  try {
    const payload = req.validated?.body || req.body;
    await createNotification(req.userId, payload);

    res.status(201).json({
      success: true,
      data: { created: true },
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const notificationId = req.validated?.params?.id ?? parseNotificationId(req.params.id);
    if (notificationId == null) {
      throw new AppError('Invalid notification id', 400);
    }

    const updated = await markRead(req.userId, notificationId);
    if (!updated) {
      throw new AppError('Notification not found', 404);
    }

    res.json({
      success: true,
      data: { updated: true },
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

async function markAllNotificationsRead(req, res, next) {
  try {
    await markAllRead(req.userId);
    res.json({
      success: true,
      data: { updated: true },
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  parseNotificationId,
  validateSettingsPayload,
  getNotificationSettings,
  updateNotificationSettings,
  listNotifications,
  createNotificationForUser,
  markNotificationRead,
  markAllNotificationsRead,
};
