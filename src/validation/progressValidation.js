const AppError = require('../utils/appError');
const { totalDays } = require('../services/progressService');

function parseStrictDayParam(rawDay) {
  const dayText = String(rawDay || '').trim();
  if (!/^[0-9]+$/.test(dayText)) {
    return null;
  }

  const day = Number.parseInt(dayText, 10);
  if (!Number.isInteger(day) || day < 1 || day > totalDays) {
    return null;
  }

  return day;
}

function validateProgressUpdatePayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('Body must be an object', 400);
  }

  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== 'completed') {
    throw new AppError('Body must contain only completed field', 400);
  }

  if (typeof body.completed !== 'boolean') {
    throw new AppError('completed must be boolean', 400);
  }

  return { completed: body.completed };
}

function validateProgressDayParams(params) {
  const day = parseStrictDayParam(params?.day);
  if (day == null) {
    throw new AppError(`day must be between 1 and ${totalDays}`, 400);
  }

  return { day };
}

module.exports = {
  parseStrictDayParam,
  validateProgressUpdatePayload,
  validateProgressDayParams,
};
