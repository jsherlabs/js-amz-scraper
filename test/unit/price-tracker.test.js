/**
 * Tests for Price Tracker Utility
 */

const {
  generateRecommendation,
  checkPriceAlert,
  compareWithAverage
} = require('../../src/utils/price-tracker');

// Mock database functions
jest.mock('../../src/utils/database', () => ({
  getPriceHistory: jest.fn(),
  getPriceStats: jest.fn(),
  saveProduct: jest.fn()
}));

const { getPriceHistory, getPriceStats } = require('../../src/utils/database');

describe('Price Tracker Utility', () => {
  describe('generateRecommendation', () => {
    it('should recommend buying at lowest price (score 5)', () => {
      const recommendation = generateRecommendation(20, 30, 20, 40);

      expect(recommendation.score).toBe(5);
      expect(recommendation.message).toContain('Excellent time to buy');
    });

    it('should give good rating below average (score 4)', () => {
      const recommendation = generateRecommendation(25, 30, 20, 40);

      expect(recommendation.score).toBe(4);
      expect(recommendation.message).toContain('Good time to buy');
    });

    it('should give fair rating at average (score 3)', () => {
      const recommendation = generateRecommendation(30, 30, 20, 40);

      expect(recommendation.score).toBe(3);
      expect(recommendation.message).toContain('Fair price');
    });

    it('should warn above average (score 2)', () => {
      const recommendation = generateRecommendation(35, 30, 20, 40);

      expect(recommendation.score).toBe(2);
      expect(recommendation.message).toContain('above average');
    });

    it('should warn at highest price (score 1)', () => {
      const recommendation = generateRecommendation(40, 30, 20, 40);

      expect(recommendation.score).toBe(1);
      expect(recommendation.message).toContain('historical high');
    });

    it('should include price details', () => {
      const recommendation = generateRecommendation(25, 30, 20, 40);

      expect(recommendation.details).toBeDefined();
      expect(recommendation.details.currentVsAverage).toBeDefined();
      expect(recommendation.details.positionInRange).toBeDefined();
    });
  });

  describe('checkPriceAlert', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should trigger alert when price drops below target', async () => {
      getPriceHistory.mockResolvedValue([{ price: 24.99, recorded_at: '2024-01-15' }]);

      const result = await checkPriceAlert('B0123456789', 25.0);

      expect(result.alert).toBe(true);
      expect(result.currentPrice).toBe(24.99);
      expect(result.message).toContain('Price alert');
    });

    it('should not trigger alert when price is above target', async () => {
      getPriceHistory.mockResolvedValue([{ price: 29.99, recorded_at: '2024-01-15' }]);

      const result = await checkPriceAlert('B0123456789', 25.0);

      expect(result.alert).toBe(false);
      expect(result.currentPrice).toBe(29.99);
      expect(result.message).toContain('above target');
    });

    it('should handle no price history', async () => {
      getPriceHistory.mockResolvedValue([]);

      const result = await checkPriceAlert('B0123456789', 25.0);

      expect(result.alert).toBe(false);
      expect(result.message).toContain('No price data');
    });
  });

  describe('compareWithAverage', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return price comparison', async () => {
      getPriceStats.mockResolvedValue({
        min_price: 20.0,
        max_price: 40.0,
        avg_price: 30.0,
        data_points: 50,
        first_recorded: '2024-01-01',
        last_recorded: '2024-01-15'
      });

      const result = await compareWithAverage('B0123456789');

      expect(result.statistics.minPrice).toBe(20.0);
      expect(result.statistics.maxPrice).toBe(40.0);
      expect(result.statistics.avgPrice).toBe('30.00');
      expect(result.dataPoints).toBe(50);
    });

    it('should calculate price difference', async () => {
      getPriceStats.mockResolvedValue({
        min_price: 20.0,
        max_price: 40.0,
        avg_price: 30.0,
        data_points: 10,
        first_recorded: '2024-01-01',
        last_recorded: '2024-01-15'
      });

      const result = await compareWithAverage('B0123456789');

      expect(result.statistics.difference).toBe(20.0);
      expect(result.statistics.percentDifference).toBe('100.00');
    });

    it('should handle no statistics', async () => {
      getPriceStats.mockResolvedValue(null);

      const result = await compareWithAverage('B0123456789');

      expect(result.message).toContain('No price data');
    });
  });
});
