function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    data: null,
    error: 'Endpoint not found',
  });
}

function errorHandler(err, req, res, next) {
  void req;
  void next;
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    success: false,
    data: null,
    error: message,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
