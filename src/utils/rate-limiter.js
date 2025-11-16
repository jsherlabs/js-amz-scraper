/**
 * Rate Limiter Utility
 *
 * Controls request rate to avoid detection and respect server limits
 */

const config = require('../config/scraper.config');

/**
 * Simple rate limiter class
 */
class RateLimiter {
  constructor(options = {}) {
    this.minDelay = options.minDelay || config.rateLimit.minDelay;
    this.maxDelay = options.maxDelay || config.rateLimit.maxDelay;
    this.randomize = options.randomize !== false;
    this.requestsPerMinute = options.requestsPerMinute || config.rateLimit.requestsPerMinute;

    this.lastRequestTime = 0;
    this.requestTimestamps = [];
  }

  /**
   * Calculate delay with optional randomization
   * @returns {number} - Delay in milliseconds
   */
  calculateDelay() {
    if (this.randomize) {
      const range = this.maxDelay - this.minDelay;
      return this.minDelay + Math.floor(Math.random() * range);
    }
    return this.minDelay;
  }

  /**
   * Wait before next request based on rate limit rules
   * @returns {Promise<void>}
   */
  async wait() {
    const now = Date.now();

    // Clean old timestamps (older than 1 minute)
    this.requestTimestamps = this.requestTimestamps.filter((timestamp) => now - timestamp < 60000);

    // Check if we've exceeded requests per minute
    if (this.requestTimestamps.length >= this.requestsPerMinute) {
      const oldestRequest = this.requestTimestamps[0];
      const timeSinceOldest = now - oldestRequest;
      const waitTime = 60000 - timeSinceOldest;

      if (waitTime > 0) {
        await this.sleep(waitTime);
      }
    }

    // Minimum delay between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    const delay = this.calculateDelay();

    if (timeSinceLastRequest < delay) {
      await this.sleep(delay - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();
    this.requestTimestamps.push(this.lastRequestTime);
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Reset rate limiter state
   */
  reset() {
    this.lastRequestTime = 0;
    this.requestTimestamps = [];
  }

  /**
   * Get current rate limiter stats
   * @returns {Object} - Stats object
   */
  getStats() {
    const now = Date.now();
    const recentRequests = this.requestTimestamps.filter((timestamp) => now - timestamp < 60000);

    return {
      requestsInLastMinute: recentRequests.length,
      requestsPerMinuteLimit: this.requestsPerMinute,
      remainingSlots: Math.max(0, this.requestsPerMinute - recentRequests.length),
      timeSinceLastRequest: now - this.lastRequestTime
    };
  }
}

/**
 * Create a new rate limiter instance
 * @param {Object} options - Rate limiter options
 * @returns {RateLimiter} - Rate limiter instance
 */
function createRateLimiter(options = {}) {
  return new RateLimiter(options);
}

/**
 * Execute a function with rate limiting
 * @param {Function} fn - Function to execute
 * @param {RateLimiter} rateLimiter - Rate limiter instance
 * @returns {Promise<*>} - Function result
 */
async function withRateLimit(fn, rateLimiter) {
  await rateLimiter.wait();
  return await fn();
}

module.exports = {
  RateLimiter,
  createRateLimiter,
  withRateLimit
};
