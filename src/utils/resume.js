/**
 * Resume Utility
 *
 * Handles saving and restoring scraper state for interrupted operations
 */

const fs = require('fs').promises;
const config = require('../config/scraper.config');
const { createConsoleLogger } = require('./logger');

/**
 * Resume state manager class
 */
class ResumeManager {
  constructor(options = {}) {
    this.stateFile = options.stateFile || config.resume.stateFile;
    this.saveInterval = options.saveInterval || config.resume.saveInterval;
    this.logger = options.logger || createConsoleLogger('info');

    this.state = {
      startTime: null,
      lastSaveTime: null,
      processedUrls: [],
      failedUrls: [],
      collectedProducts: [],
      currentUrl: null,
      currentPage: 1,
      totalPages: 0,
      metadata: {}
    };

    this.productsSinceLastSave = 0;
  }

  /**
   * Initialize or load existing state
   * @returns {Promise<Object>} - Current state
   */
  async initialize() {
    try {
      const exists = await this.stateExists();
      if (exists) {
        await this.loadState();
        this.logger.info(
          `Resuming from previous state (${this.state.collectedProducts.length} products collected)`
        );
      } else {
        this.state.startTime = new Date().toISOString();
        this.logger.debug('Starting fresh scrape (no previous state)');
      }
    } catch (error) {
      this.logger.warn(`Failed to load state: ${error.message}`);
      this.state.startTime = new Date().toISOString();
    }

    return this.state;
  }

  /**
   * Check if state file exists
   * @returns {Promise<boolean>}
   */
  async stateExists() {
    try {
      await fs.access(this.stateFile);
      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Load state from file
   * @returns {Promise<Object>} - Loaded state
   */
  async loadState() {
    try {
      const data = await fs.readFile(this.stateFile, 'utf8');
      this.state = JSON.parse(data);
      return this.state;
    } catch (error) {
      throw new Error(`Failed to load state: ${error.message}`);
    }
  }

  /**
   * Save current state to file
   * @param {boolean} force - Force save even if interval not met
   * @returns {Promise<void>}
   */
  async saveState(force = false) {
    if (!force && this.productsSinceLastSave < this.saveInterval) {
      return;
    }

    try {
      this.state.lastSaveTime = new Date().toISOString();
      const stateJson = JSON.stringify(this.state, null, 2);
      await fs.writeFile(this.stateFile, stateJson, 'utf8');
      this.productsSinceLastSave = 0;
      this.logger.debug(`State saved to ${this.stateFile}`);
    } catch (error) {
      this.logger.error(`Failed to save state: ${error.message}`);
    }
  }

  /**
   * Clear state file
   * @returns {Promise<void>}
   */
  async clearState() {
    try {
      await fs.unlink(this.stateFile);
      this.logger.debug('State file cleared');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.warn(`Failed to clear state: ${error.message}`);
      }
    }
  }

  /**
   * Record URL as processed
   * @param {string} url - URL that was processed
   * @param {boolean} success - Whether processing succeeded
   */
  markUrlProcessed(url, success = true) {
    if (success) {
      if (!this.state.processedUrls.includes(url)) {
        this.state.processedUrls.push(url);
      }
    } else {
      if (!this.state.failedUrls.includes(url)) {
        this.state.failedUrls.push(url);
      }
    }
  }

  /**
   * Check if URL was already processed
   * @param {string} url - URL to check
   * @returns {boolean}
   */
  isUrlProcessed(url) {
    return this.state.processedUrls.includes(url);
  }

  /**
   * Update current URL being processed
   * @param {string} url - Current URL
   */
  setCurrentUrl(url) {
    this.state.currentUrl = url;
  }

  /**
   * Update pagination state
   * @param {number} currentPage - Current page number
   * @param {number} totalPages - Total pages (if known)
   */
  setPaginationState(currentPage, totalPages = 0) {
    this.state.currentPage = currentPage;
    if (totalPages > 0) {
      this.state.totalPages = totalPages;
    }
  }

  /**
   * Add products to collection
   * @param {Array} products - Products to add
   */
  addProducts(products) {
    this.state.collectedProducts.push(...products);
    this.productsSinceLastSave += products.length;

    // Auto-save if interval reached
    if (this.productsSinceLastSave >= this.saveInterval) {
      this.saveState().catch((error) => {
        this.logger.error(`Auto-save failed: ${error.message}`);
      });
    }
  }

  /**
   * Get all collected products
   * @returns {Array}
   */
  getProducts() {
    return this.state.collectedProducts;
  }

  /**
   * Set custom metadata
   * @param {string} key - Metadata key
   * @param {*} value - Metadata value
   */
  setMetadata(key, value) {
    this.state.metadata[key] = value;
  }

  /**
   * Get metadata value
   * @param {string} key - Metadata key
   * @returns {*}
   */
  getMetadata(key) {
    return this.state.metadata[key];
  }

  /**
   * Get resume statistics
   * @returns {Object}
   */
  getStats() {
    return {
      startTime: this.state.startTime,
      lastSaveTime: this.state.lastSaveTime,
      processedUrls: this.state.processedUrls.length,
      failedUrls: this.state.failedUrls.length,
      collectedProducts: this.state.collectedProducts.length,
      currentUrl: this.state.currentUrl,
      currentPage: this.state.currentPage,
      totalPages: this.state.totalPages
    };
  }

  /**
   * Check if can resume from previous state
   * @returns {Promise<boolean>}
   */
  async canResume() {
    const exists = await this.stateExists();
    if (!exists) return false;

    try {
      await this.loadState();
      return this.state.processedUrls.length > 0 || this.state.collectedProducts.length > 0;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Create a checkpoint (force save current state)
   * @returns {Promise<void>}
   */
  async checkpoint() {
    await this.saveState(true);
  }

  /**
   * Finalize scraping (save final state and optionally clear)
   * @param {boolean} clearAfter - Clear state after finalize
   * @returns {Promise<void>}
   */
  async finalize(clearAfter = true) {
    await this.saveState(true);
    this.logger.info('Scraping completed successfully');

    if (clearAfter) {
      await this.clearState();
    }
  }
}

/**
 * Create a new resume manager instance
 * @param {Object} options - Resume manager options
 * @returns {ResumeManager}
 */
function createResumeManager(options = {}) {
  return new ResumeManager(options);
}

module.exports = {
  ResumeManager,
  createResumeManager
};
