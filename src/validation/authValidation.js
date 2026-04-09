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

  const displayName =
    typeof body.display_name === 'string' && body.display_name.trim().length > 0
      ? body.display_name.trim()
      : null;
  const email =
    typeof body.email === 'string' && body.email.trim().length > 0
      ? body.email.trim()
      : null;
  const photoUrl =
    typeof body.photo_url === 'string' && body.photo_url.trim().length > 0
      ? body.photo_url.trim()
      : null;

  return {
    firebaseToken,
    displayName,
    email,
    photoUrl,
  };
}

module.exports = {
  validateFirebaseExchangePayload,
};
