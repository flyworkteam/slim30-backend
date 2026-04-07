const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');
const {
	validateProgressDayParams,
	validateProgressUpdatePayload,
	validateExerciseProgressParams,
	validateExerciseProgressUpdatePayload,
} = require('../validation/progressValidation');
const {
	getDays,
	updateDay,
	getSummary,
	getDayExercises,
	updateDayExercise,
} = require('../controllers/progressController');

const router = express.Router();

router.use(requireAuth);
router.get('/days', getDays);
router.get(
	'/days/:day/exercises',
	validateRequest({ params: validateProgressDayParams }),
	getDayExercises,
);
router.put(
	'/days/:day',
	validateRequest({ params: validateProgressDayParams, body: validateProgressUpdatePayload }),
	updateDay,
);
router.put(
	'/days/:day/exercises/:exercise',
	validateRequest({ params: validateExerciseProgressParams, body: validateExerciseProgressUpdatePayload }),
	updateDayExercise,
);
router.get('/summary', getSummary);

module.exports = router;
