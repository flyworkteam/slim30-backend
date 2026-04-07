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

function parseStrictExerciseParam(rawExercise) {
  const exerciseText = String(rawExercise || '').trim();
  if (!/^[0-9]+$/.test(exerciseText)) {
    return null;
  }

  const exercise = Number.parseInt(exerciseText, 10);
  if (!Number.isInteger(exercise) || exercise < 1 || exercise > 1000) {
    return null;
  }

  return exercise;
}

function validateExerciseProgressParams(params) {
  const day = parseStrictDayParam(params?.day);
  if (day == null) {
    throw new AppError(`day must be between 1 and ${totalDays}`, 400);
  }

  const exercise = parseStrictExerciseParam(params?.exercise);
  if (exercise == null) {
    throw new AppError('exercise must be a positive integer', 400);
  }

  return { day, exercise };
}

function validateExerciseProgressUpdatePayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('Body must be an object', 400);
  }

  const allowedKeys = new Set(['completed', 'secondsSpent', 'exerciseTitle']);
  const keys = Object.keys(body);
  for (const key of keys) {
    if (!allowedKeys.has(key)) {
      throw new AppError('Body contains unsupported fields', 400);
    }
  }

  if (typeof body.completed !== 'boolean') {
    throw new AppError('completed must be boolean', 400);
  }

  let secondsSpent = 0;
  if (body.secondsSpent != null) {
    if (!Number.isInteger(body.secondsSpent) || body.secondsSpent < 0 || body.secondsSpent > 86400) {
      throw new AppError('secondsSpent must be an integer between 0 and 86400', 400);
    }
    secondsSpent = body.secondsSpent;
  }

  let exerciseTitle = null;
  if (body.exerciseTitle != null) {
    if (typeof body.exerciseTitle !== 'string') {
      throw new AppError('exerciseTitle must be string', 400);
    }
    const normalized = body.exerciseTitle.trim();
    if (normalized.length > 191) {
      throw new AppError('exerciseTitle must be at most 191 chars', 400);
    }
    exerciseTitle = normalized.length === 0 ? null : normalized;
  }

  return {
    completed: body.completed,
    secondsSpent,
    exerciseTitle,
  };
}

module.exports = {
  parseStrictDayParam,
  parseStrictExerciseParam,
  validateProgressUpdatePayload,
  validateProgressDayParams,
  validateExerciseProgressParams,
  validateExerciseProgressUpdatePayload,
};
