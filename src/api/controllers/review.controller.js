/**
 * Review Controller
 */

const { scrapeReviews: scrapeAmazonReviews } = require('../../scrapers/amazon_reviews');
const { saveReview, getReviews: getReviewsFromDb } = require('../../utils/database');
const { createConsoleLogger } = require('../../utils/logger');
const { ValidationError } = require('../../utils/errors');

const logger = createConsoleLogger('info');

/**
 * Scrape reviews for a product
 * POST /api/reviews/scrape
 */
async function scrapeReviews(req, res, next) {
  try {
    const { asin, maxPages = 5, saveToDb = true } = req.body;

    if (!asin) {
      throw new ValidationError('Product ASIN is required');
    }

    // Get io instance for WebSocket updates
    const io = req.app.get('io');

    io.emit('reviews:scraping:started', {
      asin,
      maxPages,
      timestamp: new Date().toISOString()
    });

    logger.info(`Scraping reviews for: ${asin} (max ${maxPages} pages)`);

    // Scrape reviews
    const reviewData = await scrapeAmazonReviews(asin, { maxPages, logger });

    // Save to database if requested
    let savedCount = 0;
    if (saveToDb) {
      for (const review of reviewData.reviews) {
        try {
          await saveReview(asin, review);
          savedCount++;

          // Emit progress
          io.emit('reviews:scraping:progress', {
            asin,
            savedCount,
            total: reviewData.reviews.length,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          if (!error.message.includes('already exists')) {
            logger.warn(`Failed to save review: ${error.message}`);
          }
        }
      }
      logger.info(`Saved ${savedCount} reviews to database`);
    }

    io.emit('reviews:scraping:completed', {
      asin,
      totalReviews: reviewData.totalReviews,
      savedCount,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      data: {
        asin: reviewData.asin,
        summary: reviewData.summary,
        reviews: reviewData.reviews,
        totalReviews: reviewData.totalReviews,
        savedCount,
        scrapedAt: reviewData.scrapedAt
      }
    });
  } catch (error) {
    const io = req.app.get('io');
    io.emit('reviews:scraping:failed', {
      asin: req.body.asin,
      error: error.message,
      timestamp: new Date().toISOString()
    });

    next(error);
  }
}

/**
 * Get reviews for a product from database
 * GET /api/reviews/:asin?minRating=...&limit=...&offset=...
 */
async function getReviews(req, res, next) {
  try {
    const { asin } = req.params;
    const { minRating, limit = 20, offset = 0 } = req.query;

    if (!asin) {
      throw new ValidationError('Product ASIN is required');
    }

    logger.info(`Getting reviews for: ${asin}`);

    const options = {
      minRating: minRating ? parseFloat(minRating) : undefined,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    };

    const reviews = await getReviewsFromDb(asin, options);

    res.status(200).json({
      success: true,
      data: {
        asin,
        reviews,
        count: reviews.length,
        pagination: {
          limit: options.limit,
          offset: options.offset
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  scrapeReviews,
  getReviews
};
