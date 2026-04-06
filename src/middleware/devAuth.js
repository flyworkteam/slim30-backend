const AppError = require('../utils/appError');

function requireDevUser(req, res, next) {
  if (process.env.NODE_ENV === 'production') {
    return next(new AppError('Dev auth is disabled in production', 503));
  }

  const rawHeader = req.headers['x-user-id'];
  const rawUserId = rawHeader || process.env.DEFAULT_DEV_USER_ID || '1';
  const userId = Number.parseInt(String(rawUserId), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return next(new AppError('Invalid user id', 401));
  }

  req.userId = userId;
  return next();
}

module.exports = {
  requireDevUser,
};
