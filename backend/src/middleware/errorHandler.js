const logger = require('../config/logger');

/**
 * Global error handler middleware.
 * Must be registered as the LAST middleware in server.js.
 */
function errorHandler(err, req, res, next) {
  // Log full error details on the server
  logger.error(`${req.method} ${req.url} — ${err.message}`, { stack: err.stack });

  // Prisma known errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: 'A record with this value already exists.',
      field: err.meta?.target,
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: 'Record not found.',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, error: 'Invalid token.' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, error: 'Token has expired.' });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(422).json({ success: false, error: err.message });
  }

  // Default 500
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error.' : err.message,
  });
}

module.exports = errorHandler;
