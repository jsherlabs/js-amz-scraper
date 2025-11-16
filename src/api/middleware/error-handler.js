/**
 * Error Handling Middleware
 */

const { ValidationError, ScrapingError, NavigationError } = require('../../utils/errors');

/**
 * Not Found handler
 */
function notFoundHandler(req, res, _next) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    }
  });
}

/**
 * Global error handler
 */
function errorHandler(logger) {
  return (err, req, res, _next) => {
    // Log error
    logger.error(`Error: ${err.message}`, {
      path: req.path,
      method: req.method,
      stack: err.stack
    });

    // Default error response
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    // Handle specific error types
    if (err instanceof ValidationError) {
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
      message = err.message;
    } else if (err instanceof ScrapingError) {
      statusCode = 422;
      errorCode = 'SCRAPING_ERROR';
      message = err.message;
    } else if (err instanceof NavigationError) {
      statusCode = 422;
      errorCode = 'NAVIGATION_ERROR';
      message = err.message;
    } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
      statusCode = 401;
      errorCode = 'UNAUTHORIZED';
      message = 'Invalid or missing authentication token';
    } else if (err.message.includes('not found')) {
      statusCode = 404;
      errorCode = 'NOT_FOUND';
      message = err.message;
    }

    // Send error response
    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      }
    });
  };
}

module.exports = {
  notFoundHandler,
  errorHandler
};
