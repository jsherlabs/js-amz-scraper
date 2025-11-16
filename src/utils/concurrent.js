/**
 * Concurrent Processing Utility
 *
 * Handles parallel processing of multiple URLs with worker pool
 */

const { chromium } = require('playwright');
const config = require('../config/scraper.config');
const { createConsoleLogger } = require('./logger');
const { createRateLimiter } = require('./rate-limiter');
const { TimeoutError } = require('./errors');

/**
 * Worker pool for concurrent URL processing
 */
class WorkerPool {
  constructor(options = {}) {
    this.maxWorkers = options.maxWorkers || config.concurrency.maxWorkers;
    this.workerTimeout = options.workerTimeout || config.concurrency.workerTimeout;
    this.continueOnError = options.continueOnError !== false;
    this.shareContext = options.shareContext || false;
    this.rateLimiter = options.rateLimiter || null;
    this.logger = options.logger || createConsoleLogger('info');

    this.browser = null;
    this.sharedContext = null;
    this.activeWorkers = 0;
    this.results = [];
    this.errors = [];
  }

  /**
   * Initialize browser and shared context if needed
   * @param {Object} browserOptions - Browser launch options
   * @returns {Promise<void>}
   */
  async initialize(browserOptions = {}) {
    if (this.shareContext) {
      this.logger.debug('Initializing shared browser context');
      this.browser = await chromium.launch(browserOptions);
      this.sharedContext = await this.browser.newContext();
    }
  }

  /**
   * Process a single URL
   * @param {string} url - URL to process
   * @param {Function} processFn - Processing function
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Result object
   */
  async processUrl(url, processFn, options = {}) {
    const startTime = Date.now();

    try {
      // Rate limiting
      if (this.rateLimiter) {
        await this.rateLimiter.wait();
      }

      // Apply timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new TimeoutError(`Worker timeout after ${this.workerTimeout}ms`));
        }, this.workerTimeout);
      });

      const resultPromise = processFn(url, {
        ...options,
        sharedContext: this.sharedContext
      });

      const result = await Promise.race([resultPromise, timeoutPromise]);

      const duration = Date.now() - startTime;
      this.logger.info(`✓ Completed ${url} in ${duration}ms`);

      return {
        url,
        success: true,
        result,
        duration,
        error: null
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`✗ Failed ${url}: ${error.message}`);

      return {
        url,
        success: false,
        result: null,
        duration,
        error: error.message
      };
    }
  }

  /**
   * Process multiple URLs concurrently
   * @param {Array<string>} urls - Array of URLs to process
   * @param {Function} processFn - Processing function
   * @param {Object} options - Processing options
   * @returns {Promise<Array>} - Array of results
   */
  async processUrls(urls, processFn, options = {}) {
    this.logger.info(`Processing ${urls.length} URLs with ${this.maxWorkers} workers`);

    const queue = [...urls];
    const results = [];
    const workers = [];

    // Worker function
    const worker = async () => {
      while (queue.length > 0) {
        const url = queue.shift();
        if (!url) break;

        this.activeWorkers++;
        this.logger.debug(
          `Worker starting: ${url} (${this.activeWorkers} active, ${queue.length} remaining)`
        );

        try {
          const result = await this.processUrl(url, processFn, options);
          results.push(result);

          if (result.success) {
            this.results.push(result);
          } else {
            this.errors.push(result);
            if (!this.continueOnError) {
              this.logger.error('Stopping due to error (continueOnError=false)');
              queue.length = 0; // Clear queue
              break;
            }
          }
        } catch (error) {
          this.logger.error(`Worker error: ${error.message}`);
          results.push({
            url,
            success: false,
            result: null,
            duration: 0,
            error: error.message
          });
        } finally {
          this.activeWorkers--;
        }
      }
    };

    // Start workers
    for (let i = 0; i < Math.min(this.maxWorkers, urls.length); i++) {
      workers.push(worker());
    }

    // Wait for all workers to complete
    await Promise.all(workers);

    this.logger.info(`Completed: ${this.results.length} successful, ${this.errors.length} failed`);

    return results;
  }

  /**
   * Get processing statistics
   * @returns {Object}
   */
  getStats() {
    const successfulResults = this.results.filter((r) => r.success);
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    const avgDuration = successfulResults.length > 0 ? totalDuration / successfulResults.length : 0;

    return {
      total: this.results.length + this.errors.length,
      successful: this.results.length,
      failed: this.errors.length,
      averageDuration: Math.round(avgDuration),
      totalDuration
    };
  }

  /**
   * Cleanup resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    if (this.sharedContext) {
      await this.sharedContext.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
    this.logger.debug('Worker pool cleaned up');
  }
}

/**
 * Create a new worker pool
 * @param {Object} options - Worker pool options
 * @returns {WorkerPool}
 */
function createWorkerPool(options = {}) {
  return new WorkerPool(options);
}

/**
 * Process URLs concurrently with automatic pool management
 * @param {Array<string>} urls - URLs to process
 * @param {Function} processFn - Processing function (url, options) => Promise<result>
 * @param {Object} options - Processing options
 * @returns {Promise<Array>} - Results array
 */
async function processUrlsConcurrently(urls, processFn, options = {}) {
  const {
    maxWorkers = config.concurrency.maxWorkers,
    enableRateLimit = config.rateLimit.enabled,
    logger = createConsoleLogger('info'),
    ...poolOptions
  } = options;

  const rateLimiter = enableRateLimit ? createRateLimiter() : null;

  const pool = createWorkerPool({
    maxWorkers,
    rateLimiter,
    logger,
    ...poolOptions
  });

  try {
    await pool.initialize(options.browserOptions || {});
    const results = await pool.processUrls(urls, processFn, options);
    return results;
  } finally {
    await pool.cleanup();
  }
}

/**
 * Batch process items with controlled concurrency
 * @param {Array} items - Items to process
 * @param {Function} processFn - Processing function
 * @param {Object} options - Processing options
 * @returns {Promise<Array>} - Results array
 */
async function batchProcess(items, processFn, options = {}) {
  const { batchSize = 10, concurrency = 3, logger = createConsoleLogger('info') } = options;

  const results = [];
  const batches = [];

  // Split into batches
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  logger.info(
    `Processing ${items.length} items in ${batches.length} batches (batch size: ${batchSize})`
  );

  // Process batches with controlled concurrency
  for (let i = 0; i < batches.length; i += concurrency) {
    const batchGroup = batches.slice(i, i + concurrency);
    logger.debug(
      `Processing batch group ${i / concurrency + 1}/${Math.ceil(batches.length / concurrency)}`
    );

    const batchPromises = batchGroup.map(async (batch) => {
      const batchResults = [];
      for (const item of batch) {
        try {
          const result = await processFn(item);
          batchResults.push({ success: true, item, result });
        } catch (error) {
          batchResults.push({ success: false, item, error: error.message });
        }
      }
      return batchResults;
    });

    const batchGroupResults = await Promise.all(batchPromises);
    results.push(...batchGroupResults.flat());
  }

  return results;
}

module.exports = {
  WorkerPool,
  createWorkerPool,
  processUrlsConcurrently,
  batchProcess
};
