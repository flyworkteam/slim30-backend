const AppError = require('../utils/appError');

function validateFirebaseExchangePayload(body) {
  if (!body || typeof body !== 'object') {
    throw new AppError('Request body is required', 400);
  }

  const firebaseToken =
    typeof body.firebase_token === 'string' ? body.firebase_token.trim() : '';

  if (!firebaseToken) {
    throw new AppError('firebase_token is required', 400);
  }

  return { firebaseToken };
}

module.exports = {
  validateFirebaseExchangePayload,
};
