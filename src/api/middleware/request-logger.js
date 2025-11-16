/**
 * Request Logging Middleware
 */

/**
 * Log incoming HTTP requests
 */
function requestLogger(logger) {
  return (req, res, next) => {
    const start = Date.now();

    // Log request
    logger.info(`${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip
    });

    // Log response
    res.on('finish', () => {
      const duration = Date.now() - start;
      const level = res.statusCode >= 400 ? 'warn' : 'info';

      logger[level](`${req.method} ${req.path} ${res.statusCode} ${duration}ms`, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        ip: req.ip
      });
    });

    next();
  };
}

module.exports = {
  requestLogger
};
