/**
 * Product Controller
 */

const { scrapeProductDetail } = require('../../scrapers/amazon_product_detail');
const { saveProduct, getProduct } = require('../../utils/database');
const { trackPrice } = require('../../utils/price-tracker');
const { createConsoleLogger } = require('../../utils/logger');
const { ValidationError } = require('../../utils/errors');
const { getDatabase } = require('../../utils/database');

const logger = createConsoleLogger('info');

/**
 * Scrape a product from Amazon
 * POST /api/products/scrape
 */
async function scrapeProduct(req, res, next) {
  try {
    const { url, saveToDb = true } = req.body;

    if (!url) {
      throw new ValidationError('Product URL is required');
    }

    // Get io instance for WebSocket updates
    const io = req.app.get('io');

    // Emit scraping started event
    io.emit('scrape:started', { url, timestamp: new Date().toISOString() });

    logger.info(`Scraping product: ${url}`);

    // Scrape product
    const productData = await scrapeProductDetail(url, { logger });

    // Save to database if requested
    let productId = null;
    if (saveToDb) {
      productId = await saveProduct(productData);
      logger.info(`Product saved to database (ID: ${productId})`);
    }

    // Emit scraping completed event
    io.emit('scrape:completed', {
      url,
      asin: productData.asin,
      productId,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      data: {
        product: productData,
        productId,
        scrapedAt: productData.scrapedAt
      }
    });
  } catch (error) {
    // Emit scraping failed event
    const io = req.app.get('io');
    io.emit('scrape:failed', {
      url: req.body.url,
      error: error.message,
      timestamp: new Date().toISOString()
    });

    next(error);
  }
}

/**
 * Get product details from database
 * GET /api/products/:asin
 */
async function getProductById(req, res, next) {
  try {
    const { asin } = req.params;

    if (!asin) {
      throw new ValidationError('Product ASIN is required');
    }

    logger.info(`Getting product: ${asin}`);

    const product = await getProduct(asin);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Product with ASIN ${asin} not found`
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        product
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Track product price
 * POST /api/products/:asin/track
 */
async function trackProduct(req, res, next) {
  try {
    const { asin } = req.params;

    if (!asin) {
      throw new ValidationError('Product ASIN is required');
    }

    // Get io instance for WebSocket updates
    const io = req.app.get('io');

    io.emit('track:started', { asin, timestamp: new Date().toISOString() });

    logger.info(`Tracking price for: ${asin}`);

    const result = await trackPrice(asin, { logger, saveToDb: true });

    io.emit('track:completed', {
      asin,
      currentPrice: result.currentPrice,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    const io = req.app.get('io');
    io.emit('track:failed', {
      asin: req.params.asin,
      error: error.message,
      timestamp: new Date().toISOString()
    });

    next(error);
  }
}

/**
 * List/search products
 * GET /api/products?search=...&limit=...&offset=...
 */
async function listProducts(req, res, next) {
  try {
    const { search, limit = 20, offset = 0 } = req.query;

    const db = await getDatabase();

    let query = 'SELECT * FROM products';
    const params = [];

    if (search) {
      query += ' WHERE title LIKE ? OR asin LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY last_updated DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const products = await db.all(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM products';
    if (search) {
      countQuery += ' WHERE title LIKE ? OR asin LIKE ?';
    }
    const countResult = await db.get(countQuery, search ? [`%${search}%`, `%${search}%`] : []);

    res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          total: countResult.total,
          limit: parseInt(limit, 10),
          offset: parseInt(offset, 10),
          hasMore: countResult.total > parseInt(offset, 10) + products.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  scrapeProduct,
  getProduct: getProductById,
  trackProduct,
  listProducts
};
