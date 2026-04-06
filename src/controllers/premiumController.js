const AppError = require('../utils/appError');
const { validateActivatePayload } = require('../validation/premiumValidation');
const {
  getPremiumStatus,
  startTrial,
  activatePremium,
  processWebhookEvent,
} = require('../services/premiumService');

async function getStatus(req, res, next) {
  try {
    const status = await getPremiumStatus(req.userId);
    res.json({
      success: true,
      data: { status },
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

async function startTrialHandler(req, res, next) {
  try {
    const status = await startTrial(req.userId);
    res.status(201).json({
      success: true,
      data: { status },
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

async function activateHandler(req, res, next) {
  try {
    const expectedSecret = process.env.PREMIUM_ADMIN_SECRET;
    const providedSecret = req.headers['x-premium-admin-secret'];
    if (!expectedSecret || providedSecret !== expectedSecret) {
      throw new AppError('Forbidden premium activation request', 403);
    }

    const payload = req.validated?.body || validateActivatePayload(req.body);
    const status = await activatePremium(req.userId, payload);
    res.status(201).json({
      success: true,
      data: { status },
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

async function webhookHandler(req, res, next) {
  try {
    const expectedSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
    const authHeader = req.headers.authorization;
    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      throw new AppError('Unauthorized webhook request', 401);
    }

    await processWebhookEvent(req.body?.event);
    res.json({ success: true, data: { ok: true }, error: null });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  validateActivatePayload,
  getStatus,
  startTrialHandler,
  activateHandler,
  webhookHandler,
};
