const jwt = require('jsonwebtoken');
const AppError = require('./appError');

function signAuthToken({ userId, firebaseUid }) {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AppError('Invalid user id for token signing', 500);
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError('JWT is not configured', 503);
  }

  const payload = {
    userId,
    firebase_uid: firebaseUid || null,
  };

  const options = {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    subject: String(userId),
  };

  if (process.env.JWT_ISSUER) {
    options.issuer = process.env.JWT_ISSUER;
  }

  if (process.env.JWT_AUDIENCE) {
    options.audience = process.env.JWT_AUDIENCE;
  }

  return jwt.sign(payload, secret, options);
}

module.exports = {
  signAuthToken,
};
