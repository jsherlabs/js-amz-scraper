/**
 * Review Routes
 */

const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const { strictLimiter, standardLimiter } = require('../middleware/rate-limit');
const reviewController = require('../controllers/review.controller');

/**
 * POST /api/reviews/scrape
 * Scrape reviews for a product
 */
router.post('/scrape', authenticate, strictLimiter, reviewController.scrapeReviews);

/**
 * GET /api/reviews/:asin
 * Get reviews for a product from database
 */
router.get('/:asin', optionalAuth, standardLimiter, reviewController.getReviews);

module.exports = router;
