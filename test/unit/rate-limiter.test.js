/**
 * Tests for Rate Limiter Utility
 */

const { RateLimiter, createRateLimiter, withRateLimit } = require('../../src/utils/rate-limiter');

describe('Rate Limiter Utility', () => {
  describe('RateLimiter', () => {
    it('should create rate limiter with default options', () => {
      const limiter = new RateLimiter();

      expect(limiter.minDelay).toBeGreaterThan(0);
      expect(limiter.maxDelay).toBeGreaterThan(limiter.minDelay);
    });

    it('should create rate limiter with custom options', () => {
      const limiter = new RateLimiter({
        minDelay: 500,
        maxDelay: 2000,
        requestsPerMinute: 20
      });

      expect(limiter.minDelay).toBe(500);
      expect(limiter.maxDelay).toBe(2000);
      expect(limiter.requestsPerMinute).toBe(20);
    });

    it('should calculate delay within range', () => {
      const limiter = new RateLimiter({
        minDelay: 100,
        maxDelay: 200,
        randomize: true
      });

      const delay = limiter.calculateDelay();

      expect(delay).toBeGreaterThanOrEqual(100);
      expect(delay).toBeLessThanOrEqual(200);
    });

    it('should calculate fixed delay when randomize is false', () => {
      const limiter = new RateLimiter({
        minDelay: 100,
        maxDelay: 200,
        randomize: false
      });

      const delay = limiter.calculateDelay();

      expect(delay).toBe(100);
    });

    it('should enforce minimum delay between requests', async () => {
      const limiter = new RateLimiter({
        minDelay: 100,
        maxDelay: 100,
        randomize: false,
        requestsPerMinute: 1000
      });

      const start = Date.now();
      await limiter.wait();
      await limiter.wait();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow small tolerance
    });

    it('should track requests per minute', async () => {
      const limiter = new RateLimiter({
        minDelay: 10,
        requestsPerMinute: 3
      });

      await limiter.wait();
      await limiter.wait();
      await limiter.wait();

      const stats = limiter.getStats();
      expect(stats.requestsInLastMinute).toBe(3);
      expect(stats.remainingSlots).toBe(0);
    });

    it('should reset state', () => {
      const limiter = new RateLimiter();
      limiter.lastRequestTime = 12345;
      limiter.requestTimestamps = [1, 2, 3];

      limiter.reset();

      expect(limiter.lastRequestTime).toBe(0);
      expect(limiter.requestTimestamps).toHaveLength(0);
    });

    it('should provide accurate stats', async () => {
      const limiter = new RateLimiter({
        minDelay: 10,
        requestsPerMinute: 5
      });

      await limiter.wait();
      await limiter.wait();

      const stats = limiter.getStats();

      expect(stats.requestsInLastMinute).toBe(2);
      expect(stats.requestsPerMinuteLimit).toBe(5);
      expect(stats.remainingSlots).toBe(3);
      expect(stats.timeSinceLastRequest).toBeGreaterThanOrEqual(0);
    });

    it('should clean old timestamps', async () => {
      const limiter = new RateLimiter({
        minDelay: 10,
        requestsPerMinute: 10
      });

      // Add old timestamps (older than 1 minute)
      limiter.requestTimestamps = [Date.now() - 70000, Date.now() - 65000];

      await limiter.wait();

      // Old timestamps should be removed
      expect(limiter.requestTimestamps.length).toBe(1);
    });
  });

  describe('createRateLimiter', () => {
    it('should create a new rate limiter instance', () => {
      const limiter = createRateLimiter({ minDelay: 200 });

      expect(limiter).toBeInstanceOf(RateLimiter);
      expect(limiter.minDelay).toBe(200);
    });
  });

  describe('withRateLimit', () => {
    it('should execute function with rate limiting', async () => {
      const limiter = new RateLimiter({
        minDelay: 50,
        maxDelay: 50,
        randomize: false
      });

      const fn = jest.fn().mockResolvedValue('result');
      const start = Date.now();

      const result = await withRateLimit(fn, limiter);

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalled();
    });

    it('should apply rate limit to multiple calls', async () => {
      const limiter = new RateLimiter({
        minDelay: 50,
        maxDelay: 50,
        randomize: false
      });

      const fn = jest.fn().mockResolvedValue('result');

      await withRateLimit(fn, limiter);
      const start = Date.now();
      await withRateLimit(fn, limiter);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(40);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should propagate function errors', async () => {
      const limiter = new RateLimiter();
      const fn = jest.fn().mockRejectedValue(new Error('Function error'));

      await expect(withRateLimit(fn, limiter)).rejects.toThrow('Function error');
    });
  });
});
