const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getWorkoutProgram, getWorkoutDay } = require('../controllers/workoutController');

const router = express.Router();

router.use(requireAuth);
router.get('/program', getWorkoutProgram);
router.get('/program/:day', getWorkoutDay);

module.exports = router;
