const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');
const {
	validateProgressDayParams,
	validateProgressUpdatePayload,
} = require('../validation/progressValidation');
const { getDays, updateDay, getSummary } = require('../controllers/progressController');

const router = express.Router();

router.use(requireAuth);
router.get('/days', getDays);
router.put(
	'/days/:day',
	validateRequest({ params: validateProgressDayParams, body: validateProgressUpdatePayload }),
	updateDay,
);
router.get('/summary', getSummary);

module.exports = router;
