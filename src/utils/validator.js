/**
 * Data Validation Utility
 *
 * Validates scraped product data to ensure quality and completeness.
 */

const { ValidationError } = require('./errors');
const config = require('../config/scraper.config');

/**
 * Validate a single product
 *
 * @param {Object} product - Product data to validate
 * @param {Object} rules - Validation rules (optional, uses config by default)
 * @returns {Object} - Validated product
 * @throws {ValidationError} - If validation fails
 */
function validateProduct(product, rules = config.validation) {
  const errors = [];

  // Check required fields
  if (rules.requireTitle && (!product.title || product.title.trim() === '')) {
    errors.push('Title is required');
  }

  if (rules.requirePrice && (!product.price || product.price.trim() === '')) {
    errors.push('Price is required');
  }

  if (rules.requireImage && (!product.imageUrl || product.imageUrl.trim() === '')) {
    errors.push('Image URL is required');
  }

  if (rules.requireLink && (!product.productLink || product.productLink.trim() === '')) {
    errors.push('Product link is required');
  }

  if (rules.requireAsin && (!product.asin || product.asin.trim() === '')) {
    errors.push('ASIN is required');
  }

  if (errors.length > 0) {
    throw new ValidationError(`Product validation failed: ${errors.join(', ')}`, product);
  }

  return product;
}

/**
 * Validate an array of products
 *
 * @param {Array} products - Array of products to validate
 * @param {Object} options - Validation options
 * @returns {Object} - Object with valid and invalid products
 */
function validateProducts(products, options = {}) {
  const { rules = config.validation, throwOnInvalid = false, logInvalid = true } = options;

  const valid = [];
  const invalid = [];

  for (const product of products) {
    try {
      const validated = validateProduct(product, rules);
      valid.push(validated);
    } catch (error) {
      if (throwOnInvalid) {
        throw error;
      }

      if (logInvalid) {
        console.warn(`Invalid product: ${error.message}`);
      }

      invalid.push({
        product,
        error: error.message
      });
    }
  }

  return { valid, invalid };
}

/**
 * Validate URL is an Amazon domain
 *
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid Amazon URL
 */
function isAmazonUrl(url) {
  try {
    const urlObj = new URL(url);
    const amazonDomains = [
      'amazon.com',
      'amazon.co.uk',
      'amazon.de',
      'amazon.fr',
      'amazon.it',
      'amazon.es',
      'amazon.ca',
      'amazon.com.au',
      'amazon.co.jp',
      'amazon.in'
    ];

    return amazonDomains.some(
      (domain) => urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * Sanitize product data
 *
 * @param {Object} product - Product to sanitize
 * @returns {Object} - Sanitized product
 */
function sanitizeProduct(product) {
  return {
    title: (product.title || '').trim(),
    price: (product.price || '').trim(),
    imageUrl: (product.imageUrl || '').trim(),
    productLink: (product.productLink || '').trim(),
    asin: (product.asin || '').trim()
  };
}

/**
 * Check if product has minimum required data
 *
 * @param {Object} product - Product to check
 * @returns {boolean} - True if product has minimum data
 */
function hasMinimumData(product) {
  const hasValidTitle = product.title && product.title.length > config.scraping.minTitleLength;
  const hasValidAsin = product.asin && product.asin.length > 0;
  return Boolean(hasValidTitle || hasValidAsin);
}

module.exports = {
  validateProduct,
  validateProducts,
  isAmazonUrl,
  sanitizeProduct,
  hasMinimumData
};
