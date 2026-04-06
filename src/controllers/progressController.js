const AppError = require('../utils/appError');
const {
  totalDays,
  getProgressDays,
  upsertProgressDay,
  getProgressSummary,
} = require('../services/progressService');
const {
  parseStrictDayParam,
  validateProgressUpdatePayload,
} = require('../validation/progressValidation');

async function getDays(req, res, next) {
  try {
    const days = await getProgressDays(req.userId);
    res.json({
      success: true,
      data: { days },
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

async function updateDay(req, res, next) {
  try {
    const day = req.validated?.params?.day ?? parseStrictDayParam(req.params.day);
    if (day == null) {
      throw new AppError(`day must be between 1 and ${totalDays}`, 400);
    }

    const completed = req.validated?.body?.completed ?? validateProgressUpdatePayload(req.body).completed;
    const updatedDay = await upsertProgressDay(req.userId, day, completed);

    res.json({
      success: true,
      data: { day: updatedDay },
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

async function getSummary(req, res, next) {
  try {
    const summary = await getProgressSummary(req.userId);
    res.json({
      success: true,
      data: { summary },
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  parseStrictDayParam,
  validateProgressUpdatePayload,
  getDays,
  updateDay,
  getSummary,
};
