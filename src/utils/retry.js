/**
 * Retry Utility with Exponential Backoff
 *
 * Implements retry logic for handling transient failures.
 */

const { isRetryableError, MaxRetriesExceededError } = require('./errors');
const config = require('../config/scraper.config');

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoff(attempt, initialDelay, maxDelay, multiplier) {
  const delay = initialDelay * Math.pow(multiplier, attempt - 1);
  return Math.min(delay, maxDelay);
}

/**
 * Retry an async function with exponential backoff
 *
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxAttempts - Maximum retry attempts
 * @param {number} options.initialDelay - Initial delay in ms
 * @param {number} options.maxDelay - Maximum delay in ms
 * @param {number} options.backoffMultiplier - Backoff multiplier
 * @param {Function} options.onRetry - Callback on retry (attempt, error, delay)
 * @param {Function} options.shouldRetry - Custom retry condition
 * @returns {Promise} - Result of the function
 */
async function withRetry(fn, options = {}) {
  const {
    maxAttempts = config.retry.maxAttempts,
    initialDelay = config.retry.initialDelay,
    maxDelay = config.retry.maxDelay,
    backoffMultiplier = config.retry.backoffMultiplier,
    onRetry = null,
    shouldRetry = isRetryableError
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt >= maxAttempts || !shouldRetry(error)) {
        throw attempt >= maxAttempts ? new MaxRetriesExceededError(maxAttempts, error) : error;
      }

      // Calculate backoff delay
      const delay = calculateBackoff(attempt, initialDelay, maxDelay, backoffMultiplier);

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt, error, delay);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but just in case
  throw new MaxRetriesExceededError(maxAttempts, lastError);
}

/**
 * Retry with specific configuration for page operations
 */
async function retryPageOperation(fn, operationName, logger = null) {
  return withRetry(fn, {
    onRetry: (attempt, error, delay) => {
      const message = `${operationName} failed (attempt ${attempt}), retrying in ${delay}ms: ${error.message}`;
      if (logger) {
        logger.warn(message);
      } else {
        console.warn(message);
      }
    }
  });
}

/**
 * Retry with specific configuration for network operations
 */
async function retryNetworkOperation(fn, operationName, logger = null) {
  return withRetry(fn, {
    maxAttempts: 5, // More attempts for network issues
    initialDelay: 2000, // Longer initial delay
    onRetry: (attempt, error, delay) => {
      const message = `${operationName} failed (attempt ${attempt}), retrying in ${delay}ms: ${error.message}`;
      if (logger) {
        logger.warn(message);
      } else {
        console.warn(message);
      }
    }
  });
}

module.exports = {
  withRetry,
  retryPageOperation,
  retryNetworkOperation,
  sleep,
  calculateBackoff
};
