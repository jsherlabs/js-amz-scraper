/**
 * Database Utility
 *
 * SQLite database for storing products, reviews, and price history
 */

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const { createConsoleLogger } = require('./logger');

const logger = createConsoleLogger('info');

/**
 * Database connection instance
 */
let dbInstance = null;

/**
 * Get or create database connection
 * @param {string} dbPath - Path to database file
 * @returns {Promise<Database>} - Database instance
 */
async function getDatabase(dbPath = './amazon_scraper.db') {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await open({
    filename: path.resolve(dbPath),
    driver: sqlite3.Database
  });

  await initializeDatabase(dbInstance);

  return dbInstance;
}

/**
 * Initialize database schema
 * @param {Database} db - Database instance
 */
async function initializeDatabase(db) {
  // Create products table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asin TEXT UNIQUE NOT NULL,
      title TEXT,
      brand TEXT,
      manufacturer TEXT,
      current_price REAL,
      list_price REAL,
      currency TEXT,
      availability TEXT,
      in_stock INTEGER DEFAULT 0,
      ships_from TEXT,
      sold_by TEXT,
      main_image TEXT,
      description TEXT,
      category TEXT,
      rating REAL,
      review_count INTEGER,
      bestseller INTEGER DEFAULT 0,
      amazon_choice INTEGER DEFAULT 0,
      url TEXT,
      first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_products_asin ON products(asin);
    CREATE INDEX IF NOT EXISTS idx_products_last_updated ON products(last_updated);
  `);

  // Create product_features table (for bullet points)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS product_features (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      feature TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_features_product_id ON product_features(product_id);
  `);

  // Create product_specifications table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS product_specifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      spec_key TEXT NOT NULL,
      spec_value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_specs_product_id ON product_specifications(product_id);
  `);

  // Create product_images table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      is_main INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_images_product_id ON product_images(product_id);
  `);

  // Create price_history table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      asin TEXT NOT NULL,
      price REAL,
      list_price REAL,
      currency TEXT,
      availability TEXT,
      in_stock INTEGER DEFAULT 0,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(product_id);
    CREATE INDEX IF NOT EXISTS idx_price_history_asin ON price_history(asin);
    CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at ON price_history(recorded_at);
  `);

  // Create reviews table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      asin TEXT NOT NULL,
      review_id TEXT UNIQUE,
      author TEXT,
      author_profile TEXT,
      rating REAL,
      title TEXT,
      text TEXT,
      review_date TEXT,
      verified_purchase INTEGER DEFAULT 0,
      helpful_votes TEXT,
      variant TEXT,
      scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_asin ON reviews(asin);
    CREATE INDEX IF NOT EXISTS idx_reviews_review_id ON reviews(review_id);
  `);

  // Create review_images table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS review_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_review_images_review_id ON review_images(review_id);
  `);

  // Create scrape_sessions table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS scrape_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_type TEXT,
      status TEXT,
      urls_count INTEGER DEFAULT 0,
      products_count INTEGER DEFAULT 0,
      errors_count INTEGER DEFAULT 0,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      metadata TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON scrape_sessions(started_at);
  `);

  logger.debug('Database schema initialized');
}

/**
 * Save or update product
 * @param {Object} productData - Product data
 * @returns {Promise<number>} - Product ID
 */
async function saveProduct(productData) {
  const db = await getDatabase();

  // Parse price to float
  const parsePrice = (priceStr) => {
    if (!priceStr) return null;
    const match = priceStr.match(/[\d.,]+/);
    return match ? parseFloat(match[0].replace(',', '')) : null;
  };

  const currentPrice = parsePrice(productData.price);
  const listPrice = parsePrice(productData.listPrice);

  // Check if product exists
  const existing = await db.get('SELECT id FROM products WHERE asin = ?', [productData.asin]);

  let productId;

  if (existing) {
    // Update existing product
    await db.run(
      `UPDATE products SET
        title = ?, brand = ?, manufacturer = ?,
        current_price = ?, list_price = ?, currency = ?,
        availability = ?, in_stock = ?,
        ships_from = ?, sold_by = ?,
        main_image = ?, description = ?, category = ?,
        rating = ?, review_count = ?,
        bestseller = ?, amazon_choice = ?,
        url = ?, last_updated = CURRENT_TIMESTAMP
      WHERE asin = ?`,
      [
        productData.title,
        productData.brand,
        productData.manufacturer || productData.brand,
        currentPrice,
        listPrice,
        productData.currency,
        productData.availability,
        productData.inStock ? 1 : 0,
        productData.shipsFrom,
        productData.soldBy,
        productData.mainImage,
        productData.description,
        productData.category,
        parseFloat(productData.rating) || null,
        parseInt(productData.reviewCount) || null,
        productData.bestseller ? 1 : 0,
        productData.amazonChoice ? 1 : 0,
        productData.url,
        productData.asin
      ]
    );

    productId = existing.id;
    logger.debug(`Updated product ${productData.asin}`);
  } else {
    // Insert new product
    const result = await db.run(
      `INSERT INTO products (
        asin, title, brand, manufacturer,
        current_price, list_price, currency,
        availability, in_stock,
        ships_from, sold_by,
        main_image, description, category,
        rating, review_count,
        bestseller, amazon_choice,
        url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productData.asin,
        productData.title,
        productData.brand,
        productData.manufacturer || productData.brand,
        currentPrice,
        listPrice,
        productData.currency,
        productData.availability,
        productData.inStock ? 1 : 0,
        productData.shipsFrom,
        productData.soldBy,
        productData.mainImage,
        productData.description,
        productData.category,
        parseFloat(productData.rating) || null,
        parseInt(productData.reviewCount) || null,
        productData.bestseller ? 1 : 0,
        productData.amazonChoice ? 1 : 0,
        productData.url
      ]
    );

    productId = result.lastID;
    logger.debug(`Inserted new product ${productData.asin}`);
  }

  // Save features
  if (productData.features && productData.features.length > 0) {
    await db.run('DELETE FROM product_features WHERE product_id = ?', [productId]);

    for (let i = 0; i < productData.features.length; i++) {
      await db.run(
        'INSERT INTO product_features (product_id, feature, sort_order) VALUES (?, ?, ?)',
        [productId, productData.features[i], i]
      );
    }
  }

  // Save specifications
  if (productData.specifications && Object.keys(productData.specifications).length > 0) {
    await db.run('DELETE FROM product_specifications WHERE product_id = ?', [productId]);

    for (const [key, value] of Object.entries(productData.specifications)) {
      await db.run(
        'INSERT INTO product_specifications (product_id, spec_key, spec_value) VALUES (?, ?, ?)',
        [productId, key, value]
      );
    }
  }

  // Save images
  if (productData.images && productData.images.length > 0) {
    await db.run('DELETE FROM product_images WHERE product_id = ? AND is_main = 0', [productId]);

    for (let i = 0; i < productData.images.length; i++) {
      await db.run(
        'INSERT INTO product_images (product_id, image_url, is_main, sort_order) VALUES (?, ?, ?, ?)',
        [productId, productData.images[i], 0, i]
      );
    }
  }

  // Record price history
  if (currentPrice !== null) {
    await db.run(
      `INSERT INTO price_history (product_id, asin, price, list_price, currency, availability, in_stock)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        productData.asin,
        currentPrice,
        listPrice,
        productData.currency,
        productData.availability,
        productData.inStock ? 1 : 0
      ]
    );
  }

  return productId;
}

/**
 * Save review
 * @param {string} asin - Product ASIN
 * @param {Object} reviewData - Review data
 * @returns {Promise<number>} - Review ID
 */
async function saveReview(asin, reviewData) {
  const db = await getDatabase();

  // Get product ID
  const product = await db.get('SELECT id FROM products WHERE asin = ?', [asin]);

  if (!product) {
    throw new Error(`Product with ASIN ${asin} not found. Save product first.`);
  }

  // Check if review already exists
  if (reviewData.id) {
    const existing = await db.get('SELECT id FROM reviews WHERE review_id = ?', [reviewData.id]);
    if (existing) {
      logger.debug(`Review ${reviewData.id} already exists, skipping`);
      return existing.id;
    }
  }

  // Insert review
  const result = await db.run(
    `INSERT INTO reviews (
      product_id, asin, review_id, author, author_profile,
      rating, title, text, review_date, verified_purchase,
      helpful_votes, variant
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      product.id,
      asin,
      reviewData.id || null,
      reviewData.author,
      reviewData.authorProfile,
      parseFloat(reviewData.rating) || null,
      reviewData.title,
      reviewData.text,
      reviewData.date,
      reviewData.verifiedPurchase ? 1 : 0,
      reviewData.helpfulVotes,
      reviewData.variant
    ]
  );

  const reviewId = result.lastID;

  // Save review images
  if (reviewData.images && reviewData.images.length > 0) {
    for (const imageUrl of reviewData.images) {
      await db.run('INSERT INTO review_images (review_id, image_url) VALUES (?, ?)', [
        reviewId,
        imageUrl
      ]);
    }
  }

  return reviewId;
}

/**
 * Get product by ASIN
 * @param {string} asin - Product ASIN
 * @returns {Promise<Object|null>} - Product data
 */
async function getProduct(asin) {
  const db = await getDatabase();

  const product = await db.get('SELECT * FROM products WHERE asin = ?', [asin]);

  if (!product) {
    return null;
  }

  // Get related data
  product.features = await db.all(
    'SELECT feature FROM product_features WHERE product_id = ? ORDER BY sort_order',
    [product.id]
  );

  product.specifications = await db.all(
    'SELECT spec_key, spec_value FROM product_specifications WHERE product_id = ?',
    [product.id]
  );

  product.images = await db.all(
    'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order',
    [product.id]
  );

  return product;
}

/**
 * Get price history for a product
 * @param {string} asin - Product ASIN
 * @param {number} limit - Number of records to return
 * @returns {Promise<Array>} - Price history
 */
async function getPriceHistory(asin, limit = 100) {
  const db = await getDatabase();

  return await db.all(
    `SELECT price, list_price, currency, availability, in_stock, recorded_at
     FROM price_history
     WHERE asin = ?
     ORDER BY recorded_at DESC
     LIMIT ?`,
    [asin, limit]
  );
}

/**
 * Get reviews for a product
 * @param {string} asin - Product ASIN
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Reviews
 */
async function getReviews(asin, options = {}) {
  const { limit = 100, offset = 0, minRating = null } = options;

  const db = await getDatabase();

  let query = 'SELECT * FROM reviews WHERE asin = ?';
  const params = [asin];

  if (minRating !== null) {
    query += ' AND rating >= ?';
    params.push(minRating);
  }

  query += ' ORDER BY scraped_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return await db.all(query, params);
}

/**
 * Get price statistics for a product
 * @param {string} asin - Product ASIN
 * @returns {Promise<Object>} - Price statistics
 */
async function getPriceStats(asin) {
  const db = await getDatabase();

  const stats = await db.get(
    `SELECT
      MIN(price) as min_price,
      MAX(price) as max_price,
      AVG(price) as avg_price,
      COUNT(*) as data_points,
      MIN(recorded_at) as first_recorded,
      MAX(recorded_at) as last_recorded
     FROM price_history
     WHERE asin = ? AND price IS NOT NULL`,
    [asin]
  );

  return stats || null;
}

/**
 * Close database connection
 */
async function closeDatabase() {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
    logger.debug('Database connection closed');
  }
}

module.exports = {
  getDatabase,
  saveProduct,
  saveReview,
  getProduct,
  getPriceHistory,
  getReviews,
  getPriceStats,
  closeDatabase
};
