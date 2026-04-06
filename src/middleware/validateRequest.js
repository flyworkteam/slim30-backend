const AppError = require('../utils/appError');

function toValidationError(error) {
  if (error instanceof AppError) {
    return error;
  }

  return new AppError('Invalid request payload', 400);
}

function validateRequest(validators = {}) {
  const { body, params, query } = validators;

  return (req, res, next) => {
    void res;

    try {
      const validated = {};

      if (typeof body === 'function') {
        validated.body = body(req.body);
      }

      if (typeof params === 'function') {
        validated.params = params(req.params);
      }

      if (typeof query === 'function') {
        validated.query = query(req.query);
      }

      req.validated = validated;
      next();
    } catch (error) {
      next(toValidationError(error));
    }
  };
}

module.exports = {
  validateRequest,
};
