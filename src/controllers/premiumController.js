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
    const status = await getPremiumStatus(req.userId, req.locale);
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
    const status = await startTrial(req.userId, req.locale);
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
    const payload = req.validated?.body || validateActivatePayload(req.body);
    const status = await activatePremium(req.userId, payload, req.locale);
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
