const { getProgram, buildWorkoutDay } = require('../services/workoutProgramService');

function parseStrictDayParam(rawDay) {
  const dayText = String(rawDay || '').trim();
  if (!/^[0-9]+$/.test(dayText)) {
    return null;
  }

  const day = Number.parseInt(dayText, 10);
  if (!Number.isInteger(day)) {
    return null;
  }

  return day;
}

function getWorkoutProgram(req, res, next) {
  try {
    const program = getProgram();
    void req;
    res.json({
      success: true,
      data: { program },
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

function getWorkoutDay(req, res, next) {
  try {
    const day = parseStrictDayParam(req.params.day);
    const workoutDay = buildWorkoutDay(day);
    res.json({
      success: true,
      data: { day: workoutDay },
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getWorkoutProgram,
  getWorkoutDay,
  parseStrictDayParam,
};
