const express = require('express');
const { validateRequest } = require('../middleware/validateRequest');
const { validateFirebaseExchangePayload } = require('../validation/authValidation');
const {
  createGuestSession,
  exchangeFirebaseToken,
} = require('../controllers/authController');

const router = express.Router();

router.post(
  '/exchange',
  validateRequest({ body: validateFirebaseExchangePayload }),
  exchangeFirebaseToken,
);
router.post('/guest', createGuestSession);

module.exports = router;
