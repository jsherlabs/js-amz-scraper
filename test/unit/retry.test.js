const { withRetry, calculateBackoff, sleep } = require('../../src/utils/retry');
const { MaxRetriesExceededError } = require('../../src/utils/errors');

describe('Retry Utility', () => {
  describe('calculateBackoff', () => {
    it('should calculate exponential backoff correctly', () => {
      expect(calculateBackoff(1, 1000, 30000, 2)).toBe(1000);
      expect(calculateBackoff(2, 1000, 30000, 2)).toBe(2000);
      expect(calculateBackoff(3, 1000, 30000, 2)).toBe(4000);
      expect(calculateBackoff(4, 1000, 30000, 2)).toBe(8000);
    });

    it('should not exceed maximum delay', () => {
      expect(calculateBackoff(10, 1000, 5000, 2)).toBe(5000);
      expect(calculateBackoff(20, 1000, 5000, 2)).toBe(5000);
    });
  });

  describe('sleep', () => {
    it('should sleep for specified time', async () => {
      const start = Date.now();
      await sleep(100);
      const duration = Date.now() - start;
      expect(duration).toBeGreaterThanOrEqual(90);
      expect(duration).toBeLessThan(150);
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await withRetry(fn, { maxAttempts: 3 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const error = new Error('Temporary error');
      error.retryable = true;
      const fn = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

      const result = await withRetry(fn, {
        maxAttempts: 3,
        initialDelay: 10
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw MaxRetriesExceededError after max attempts', async () => {
      const error = new Error('Persistent error');
      error.retryable = true;
      const fn = jest.fn().mockRejectedValue(error);

      await expect(
        withRetry(fn, {
          maxAttempts: 3,
          initialDelay: 10
        })
      ).rejects.toThrow(MaxRetriesExceededError);

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors', async () => {
      const error = new Error('Non-retryable error');
      error.retryable = false;
      const fn = jest.fn().mockRejectedValue(error);

      await expect(
        withRetry(fn, {
          maxAttempts: 3,
          initialDelay: 10
        })
      ).rejects.toThrow('Non-retryable error');

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry callback', async () => {
      const onRetry = jest.fn();
      const error = new Error('Retryable error');
      error.retryable = true;

      const fn = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

      await withRetry(fn, {
        maxAttempts: 3,
        initialDelay: 10,
        onRetry
      });

      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), 10);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should use custom shouldRetry function', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('CUSTOM_ERROR'))
        .mockResolvedValue('success');

      const shouldRetry = (error) => error.message.includes('CUSTOM_ERROR');

      const result = await withRetry(fn, {
        maxAttempts: 3,
        initialDelay: 10,
        shouldRetry
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});
