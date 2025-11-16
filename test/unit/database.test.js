/**
 * Tests for Database Utility
 */

const fs = require('fs');
const path = require('path');
const {
  getDatabase,
  saveProduct,
  saveReview,
  getProduct,
  getPriceHistory,
  getReviews,
  getPriceStats,
  closeDatabase
} = require('../../src/utils/database');

// Use test database
const TEST_DB = './test_amazon_scraper.db';

describe('Database Utility', () => {
  beforeAll(async () => {
    // Clean up test database if it exists
    if (fs.existsSync(TEST_DB)) {
      fs.unlinkSync(TEST_DB);
    }
  });

  afterAll(async () => {
    await closeDatabase();
    // Clean up test database
    if (fs.existsSync(TEST_DB)) {
      fs.unlinkSync(TEST_DB);
    }
  });

  describe('Database Initialization', () => {
    it('should create database and initialize schema', async () => {
      const db = await getDatabase(TEST_DB);
      expect(db).toBeDefined();

      // Check if tables exist
      const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");

      const tableNames = tables.map((t) => t.name);
      expect(tableNames).toContain('products');
      expect(tableNames).toContain('price_history');
      expect(tableNames).toContain('reviews');
    });
  });

  describe('Product Operations', () => {
    const testProduct = {
      asin: 'B0TEST12345',
      title: 'Test Product',
      brand: 'Test Brand',
      price: '$29.99',
      listPrice: '$39.99',
      currency: '$',
      availability: 'In Stock',
      inStock: true,
      shipsFrom: 'Amazon',
      soldBy: 'Amazon.com',
      mainImage: 'https://example.com/image.jpg',
      description: 'Test description',
      category: 'Electronics',
      rating: '4.5 out of 5 stars',
      reviewCount: '100',
      bestseller: true,
      amazonChoice: false,
      url: 'https://amazon.com/dp/B0TEST12345',
      features: ['Feature 1', 'Feature 2'],
      specifications: { Brand: 'Test Brand', Model: 'XYZ' },
      images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg']
    };

    it('should save a new product', async () => {
      const productId = await saveProduct(testProduct);
      expect(productId).toBeGreaterThan(0);
    });

    it('should update existing product', async () => {
      const updatedProduct = { ...testProduct, price: '$24.99' };
      const productId = await saveProduct(updatedProduct);
      expect(productId).toBeGreaterThan(0);

      const product = await getProduct(testProduct.asin);
      expect(product.current_price).toBe(24.99);
    });

    it('should get product by ASIN', async () => {
      const product = await getProduct(testProduct.asin);

      expect(product).toBeDefined();
      expect(product.asin).toBe(testProduct.asin);
      expect(product.title).toBe(testProduct.title);
      expect(product.brand).toBe(testProduct.brand);
    });

    it('should include features, specs, and images', async () => {
      const product = await getProduct(testProduct.asin);

      expect(product.features).toHaveLength(2);
      expect(product.specifications).toHaveLength(2);
      expect(product.images).toHaveLength(2);
    });

    it('should return null for non-existent product', async () => {
      const product = await getProduct('B0NOTEXIST');
      expect(product).toBeNull();
    });
  });

  describe('Price History', () => {
    it('should create price history entry when saving product', async () => {
      const history = await getPriceHistory('B0TEST12345', 10);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should get price statistics', async () => {
      const stats = await getPriceStats('B0TEST12345');

      expect(stats).toBeDefined();
      expect(stats.min_price).toBeDefined();
      expect(stats.max_price).toBeDefined();
      expect(stats.avg_price).toBeDefined();
      expect(stats.data_points).toBeGreaterThan(0);
    });

    it('should return null stats for non-existent product', async () => {
      const stats = await getPriceStats('B0NOTEXIST');
      expect(stats).toBeNull();
    });
  });

  describe('Review Operations', () => {
    const testReview = {
      id: 'R123TEST',
      author: 'Test User',
      authorProfile: '/profile/test',
      rating: '5.0 out of 5 stars',
      title: 'Great product!',
      text: 'I love this product, works perfectly.',
      date: 'January 1, 2024',
      verifiedPurchase: true,
      helpfulVotes: '10 people found this helpful',
      images: ['https://example.com/review1.jpg'],
      variant: 'Color: Black'
    };

    it('should save review for existing product', async () => {
      const reviewId = await saveReview('B0TEST12345', testReview);
      expect(reviewId).toBeGreaterThan(0);
    });

    it('should not save duplicate review', async () => {
      const reviewId = await saveReview('B0TEST12345', testReview);
      expect(reviewId).toBeGreaterThan(0); // Returns existing ID
    });

    it('should get reviews for product', async () => {
      const reviews = await getReviews('B0TEST12345', { limit: 10 });
      expect(reviews.length).toBeGreaterThan(0);
      expect(reviews[0].author).toBe(testReview.author);
    });

    it('should filter reviews by rating', async () => {
      const reviews = await getReviews('B0TEST12345', {
        minRating: 4.0,
        limit: 10
      });

      reviews.forEach((review) => {
        expect(review.rating).toBeGreaterThanOrEqual(4.0);
      });
    });

    it('should throw error for non-existent product', async () => {
      await expect(saveReview('B0NOTEXIST', testReview)).rejects.toThrow(
        'Product with ASIN B0NOTEXIST not found'
      );
    });
  });
});
