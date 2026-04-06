const AppError = require('../utils/appError');

function parseNotificationId(rawId) {
  const text = String(rawId || '').trim();
  if (!/^[0-9]+$/.test(text)) {
    return null;
  }

  const maxSafeIntText = String(Number.MAX_SAFE_INTEGER);
  if (text.length > maxSafeIntText.length || (text.length === maxSafeIntText.length && text > maxSafeIntText)) {
    return null;
  }

  const id = Number.parseInt(text, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

function validateSettingsPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('Body must be an object', 400);
  }

  const allowedKeys = new Set([
    'dailyReminderEnabled',
    'workoutReminderEnabled',
    'progressSummaryEnabled',
    'reminderHour',
  ]);

  for (const key of Object.keys(body)) {
    if (!allowedKeys.has(key)) {
      throw new AppError(`Unsupported field: ${key}`, 400);
    }
  }

  for (const key of ['dailyReminderEnabled', 'workoutReminderEnabled', 'progressSummaryEnabled']) {
    if (typeof body[key] !== 'boolean') {
      throw new AppError(`${key} must be boolean`, 400);
    }
  }

  if (!Number.isInteger(body.reminderHour) || body.reminderHour < 0 || body.reminderHour > 23) {
    throw new AppError('reminderHour must be an integer between 0 and 23', 400);
  }

  return {
    dailyReminderEnabled: body.dailyReminderEnabled,
    workoutReminderEnabled: body.workoutReminderEnabled,
    progressSummaryEnabled: body.progressSummaryEnabled,
    reminderHour: body.reminderHour,
  };
}

function validateCreateNotificationPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('Body must be an object', 400);
  }

  if (typeof body.title !== 'string' || body.title.trim().length < 2 || body.title.trim().length > 191) {
    throw new AppError('title must be a string between 2 and 191 chars', 400);
  }

  if (typeof body.body !== 'string' || body.body.trim().length < 2 || body.body.trim().length > 500) {
    throw new AppError('body must be a string between 2 and 500 chars', 400);
  }

  if (body.iconName != null) {
    if (typeof body.iconName !== 'string') {
      throw new AppError('iconName must be a string', 400);
    }

    const iconName = body.iconName.trim();
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(iconName)) {
      throw new AppError('iconName must match [a-zA-Z0-9_-] and max 64 chars', 400);
    }
  }

  if (body.iconBgHex != null) {
    if (typeof body.iconBgHex !== 'string') {
      throw new AppError('iconBgHex must be a string', 400);
    }

    const color = body.iconBgHex.trim();
    if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) {
      throw new AppError('iconBgHex must be a valid hex color', 400);
    }
  }

  return {
    title: body.title.trim(),
    body: body.body.trim(),
    iconName: typeof body.iconName === 'string' ? body.iconName.trim() : undefined,
    iconBgHex: typeof body.iconBgHex === 'string' ? body.iconBgHex.trim() : undefined,
  };
}

function validateNotificationIdParams(params) {
  const id = parseNotificationId(params?.id);
  if (id == null) {
    throw new AppError('Invalid notification id', 400);
  }

  return { id };
}

function validateNotificationListQuery(query) {
  if (!Object.prototype.hasOwnProperty.call(query || {}, 'limit')) {
    return { limit: 50 };
  }

  const parsed = Number.parseInt(String(query.limit), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new AppError('limit must be an integer between 1 and 100', 400);
  }

  return { limit: parsed };
}

module.exports = {
  parseNotificationId,
  validateSettingsPayload,
  validateCreateNotificationPayload,
  validateNotificationIdParams,
  validateNotificationListQuery,
};
