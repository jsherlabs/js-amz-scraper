/**
 * Price Tracking Routes
 */

const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const { standardLimiter } = require('../middleware/rate-limit');
const priceController = require('../controllers/price.controller');

/**
 * GET /api/prices/:asin/history
 * Get price history for a product
 */
router.get('/:asin/history', optionalAuth, standardLimiter, priceController.getPriceHistory);

/**
 * GET /api/prices/:asin/stats
 * Get price statistics for a product
 */
router.get('/:asin/stats', optionalAuth, standardLimiter, priceController.getPriceStats);

/**
 * GET /api/prices/:asin/analysis
 * Get price analysis and recommendation
 */
router.get('/:asin/analysis', optionalAuth, standardLimiter, priceController.analyzePrices);

/**
 * GET /api/prices/:asin/chart
 * Get price chart data
 */
router.get('/:asin/chart', optionalAuth, standardLimiter, priceController.getChartData);

module.exports = router;
