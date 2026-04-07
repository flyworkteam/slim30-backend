const AppError = require('../utils/appError');
const {
  totalDays,
  getProgressDays,
  upsertProgressDay,
  getExerciseProgressByDay,
  upsertExerciseProgressDay,
  getProgressSummary,
} = require('../services/progressService');
const {
  parseStrictDayParam,
  parseStrictExerciseParam,
  validateProgressUpdatePayload,
  validateExerciseProgressUpdatePayload,
} = require('../validation/progressValidation');
const { buildWorkoutDay } = require('../services/workoutProgramService');

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

async function getDayExercises(req, res, next) {
  try {
    const day = req.validated?.params?.day ?? parseStrictDayParam(req.params.day);
    if (day == null) {
      throw new AppError(`day must be between 1 and ${totalDays}`, 400);
    }

    const exercises = await getExerciseProgressByDay(req.userId, day);
    res.json({
      success: true,
      data: { day, exercises },
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

async function updateDayExercise(req, res, next) {
  try {
    const day = req.validated?.params?.day ?? parseStrictDayParam(req.params.day);
    if (day == null) {
      throw new AppError(`day must be between 1 and ${totalDays}`, 400);
    }

    const exercise = req.validated?.params?.exercise ?? parseStrictExerciseParam(req.params.exercise);
    if (exercise == null) {
      throw new AppError('exercise must be a positive integer', 400);
    }

    const payload = req.validated?.body ?? validateExerciseProgressUpdatePayload(req.body);
    const canonicalDay = buildWorkoutDay(day);
    if (canonicalDay.type !== 'workout' || !Array.isArray(canonicalDay.exercises) || canonicalDay.exercises.length === 0) {
      throw new AppError('No exercises available for selected day', 400);
    }

    const canonicalExercise = canonicalDay.exercises[exercise - 1];
    if (!canonicalExercise) {
      throw new AppError('exercise is out of range for day', 400);
    }

    const updatedExercise = await upsertExerciseProgressDay(req.userId, day, exercise, {
      ...payload,
      exerciseTitle: canonicalExercise.name,
    });
    res.json({
      success: true,
      data: { exercise: updatedExercise },
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
  getDayExercises,
  updateDayExercise,
};
