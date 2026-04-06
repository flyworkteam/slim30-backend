const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');
const {
  requirePremiumAdminSecret,
  requireRevenueCatSecret,
} = require('../middleware/premiumSecret');
const { validateActivatePayload } = require('../validation/premiumValidation');
const {
  getStatus,
  startTrialHandler,
  activateHandler,
  webhookHandler,
} = require('../controllers/premiumController');

const router = express.Router();

router.get('/status', requireAuth, getStatus);
router.post('/trial/start', requireAuth, startTrialHandler);
router.post('/activate', requireAuth, requirePremiumAdminSecret, validateRequest({ body: validateActivatePayload }), activateHandler);
router.post('/webhook', requireRevenueCatSecret, webhookHandler);

module.exports = router;
