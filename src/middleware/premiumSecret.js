const crypto = require('node:crypto');
const AppError = require('../utils/appError');

function toSingleHeaderValue(value) {
  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return typeof value === 'string' ? value : '';
}

function parseBearerToken(rawAuthorization) {
  const authorization = toSingleHeaderValue(rawAuthorization).trim();
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(' ');
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  return token.trim();
}

function safeCompareSecret(provided, expected) {
  if (typeof expected !== 'string' || expected.length === 0 || typeof provided !== 'string') {
    return false;
  }

  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function requirePremiumAdminSecret(req, res, next) {
  void res;
  const expectedSecret = process.env.PREMIUM_ADMIN_SECRET;
  const providedSecret = toSingleHeaderValue(req.headers['x-premium-admin-secret']);

  if (!safeCompareSecret(providedSecret, expectedSecret)) {
    next(new AppError('Forbidden premium activation request', 403));
    return;
  }

  next();
}

function requireRevenueCatSecret(req, res, next) {
  void res;
  const expectedSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
  const providedToken = parseBearerToken(req.headers.authorization);

  if (!safeCompareSecret(providedToken, expectedSecret)) {
    next(new AppError('Unauthorized webhook request', 401));
    return;
  }

  next();
}

module.exports = {
  requirePremiumAdminSecret,
  requireRevenueCatSecret,
};
