/**
 * Rate Limiting Middleware
 */

const rateLimit = require('express-rate-limit');
const config = require('../config/api.config');

/**
 * Create rate limiter middleware
 */
function createRateLimiter(options = {}) {
  if (!config.rateLimit.enabled) {
    // Return no-op middleware if rate limiting is disabled
    return (_req, _res, next) => next();
  }

  return rateLimit({
    windowMs: options.windowMs || config.rateLimit.windowMs,
    max: options.max || config.rateLimit.max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: options.message || config.rateLimit.message
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Key generator (use IP address by default)
    keyGenerator: (req) => {
      return req.user?.id || req.ip;
    }
  });
}

/**
 * Strict rate limiter for expensive operations (scraping)
 */
const strictLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  message: 'Too many scraping requests. Please try again later.'
});

/**
 * Standard rate limiter for normal API operations
 */
const standardLimiter = createRateLimiter();

module.exports = {
  createRateLimiter,
  strictLimiter,
  standardLimiter
};
