/**
 * Custom Error Classes for Amazon Scraper
 *
 * These error classes provide better error handling and debugging.
 */

/**
 * Base class for all scraper-related errors
 */
class ScraperError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
    this.retryable = options.retryable || false;
    this.statusCode = options.statusCode || null;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when navigation to URL fails
 */
class NavigationError extends ScraperError {
  constructor(url, originalError) {
    super(`Failed to navigate to ${url}: ${originalError.message}`, {
      retryable: true
    });
    this.url = url;
    this.originalError = originalError;
  }
}

/**
 * Thrown when page content fails to load
 */
class PageLoadError extends ScraperError {
  constructor(message, options = {}) {
    super(message, { retryable: true, ...options });
  }
}

/**
 * Thrown when product extraction fails
 */
class ExtractionError extends ScraperError {
  constructor(message, options = {}) {
    super(message, { retryable: false, ...options });
  }
}

/**
 * Thrown when no products are found on the page
 */
class NoProductsFoundError extends ScraperError {
  constructor(url) {
    super(`No products found at ${url}`, { retryable: false });
    this.url = url;
  }
}

/**
 * Thrown when data validation fails
 */
class ValidationError extends ScraperError {
  constructor(message, data = null) {
    super(message, { retryable: false });
    this.data = data;
  }
}

/**
 * Thrown when timeout occurs
 */
class TimeoutError extends ScraperError {
  constructor(operation, timeout) {
    super(`Timeout after ${timeout}ms during: ${operation}`, {
      retryable: true
    });
    this.operation = operation;
    this.timeout = timeout;
  }
}

/**
 * Thrown when maximum retry attempts are reached
 */
class MaxRetriesExceededError extends ScraperError {
  constructor(attempts, originalError) {
    super(`Maximum retry attempts (${attempts}) exceeded`, {
      retryable: false
    });
    this.attempts = attempts;
    this.originalError = originalError;
  }
}

/**
 * Thrown when browser fails to launch or crashes
 */
class BrowserError extends ScraperError {
  constructor(message, originalError = null) {
    super(message, { retryable: true });
    this.originalError = originalError;
  }
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error) {
  if (error.retryable) {
    return true;
  }

  // Check for known retryable error patterns
  const retryablePatterns = [
    /timeout/i,
    /network/i,
    /connection/i,
    /ECONNRESET/,
    /ETIMEDOUT/,
    /net::ERR_/,
    /Navigation timeout/
  ];

  return retryablePatterns.some((pattern) => pattern.test(error.message));
}

module.exports = {
  ScraperError,
  NavigationError,
  PageLoadError,
  ExtractionError,
  NoProductsFoundError,
  ValidationError,
  TimeoutError,
  MaxRetriesExceededError,
  BrowserError,
  isRetryableError
};
