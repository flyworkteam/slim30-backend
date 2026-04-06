const AppError = require('../utils/appError');

function parsePrice(rawPrice) {
  const price = Number(rawPrice);
  if (!Number.isFinite(price) || price < 0 || price > 1000000) {
    return null;
  }
  return Number(price.toFixed(2));
}

function validateActivatePayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('Body must be an object', 400);
  }

  const normalizedPlanType = String(body.planType || '').trim().toLowerCase();
  const allowedPlanTypes = new Set(['monthly', 'yearly', 'lifetime']);
  if (!allowedPlanTypes.has(normalizedPlanType)) {
    throw new AppError('planType must be one of: monthly, yearly, lifetime', 400);
  }

  const price = parsePrice(body.price);
  if (price == null) {
    throw new AppError('price must be a valid non-negative number', 400);
  }

  const currency = String(body.currency || '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new AppError('currency must be a 3-letter ISO code', 400);
  }

  const source = String(body.source || 'manual').trim().toLowerCase();
  if (!new Set(['manual', 'revenuecat', 'admin']).has(source)) {
    throw new AppError('source must be one of: manual, revenuecat, admin', 400);
  }

  let expiresAt = null;
  if (normalizedPlanType !== 'lifetime') {
    if (typeof body.expiresAt !== 'string' || Number.isNaN(Date.parse(body.expiresAt))) {
      throw new AppError('expiresAt must be a valid ISO date string for non-lifetime plans', 400);
    }
    expiresAt = body.expiresAt;
  }

  let externalSubscriptionId;
  if (body.externalSubscriptionId != null) {
    if (typeof body.externalSubscriptionId !== 'string') {
      throw new AppError('externalSubscriptionId must be a string', 400);
    }
    const normalized = body.externalSubscriptionId.trim();
    if (normalized.length < 3 || normalized.length > 191) {
      throw new AppError('externalSubscriptionId must be between 3 and 191 chars', 400);
    }
    externalSubscriptionId = normalized;
  }

  return {
    planType: normalizedPlanType,
    price,
    currency,
    source,
    expiresAt,
    externalSubscriptionId,
  };
}

module.exports = {
  validateActivatePayload,
};
