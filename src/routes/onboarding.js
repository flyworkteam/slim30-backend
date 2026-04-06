const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');
const {
  validateAnswersPayload,
  validateQuestionKeyParams,
} = require('../validation/onboardingValidation');
const {
  getAnswers,
  upsertAnswers,
  deleteAnswer,
} = require('../controllers/onboardingController');

const router = express.Router();

router.use(requireAuth);
router.get('/answers', getAnswers);
router.put('/answers', validateRequest({ body: validateAnswersPayload }), upsertAnswers);
router.delete('/answers/:questionKey', validateRequest({ params: validateQuestionKeyParams }), deleteAnswer);

module.exports = router;
