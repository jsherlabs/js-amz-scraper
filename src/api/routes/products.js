/**
 * Product Routes
 */

const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const { strictLimiter, standardLimiter } = require('../middleware/rate-limit');
const productController = require('../controllers/product.controller');

/**
 * POST /api/products/scrape
 * Scrape a product from Amazon
 */
router.post('/scrape', authenticate, strictLimiter, productController.scrapeProduct);

/**
 * GET /api/products/:asin
 * Get product details from database
 */
router.get('/:asin', optionalAuth, standardLimiter, productController.getProduct);

/**
 * GET /api/products/:asin/track
 * Track product price (scrape and save)
 */
router.post('/:asin/track', authenticate, strictLimiter, productController.trackProduct);

/**
 * GET /api/products
 * Search/list products
 */
router.get('/', optionalAuth, standardLimiter, productController.listProducts);

module.exports = router;
