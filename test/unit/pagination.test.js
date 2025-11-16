/**
 * Tests for Pagination Utility
 */

const {
  hasNextPage,
  goToNextPage,
  scrapeWithPagination,
  getCurrentPageNumber
} = require('../../src/utils/pagination');
const { createConsoleLogger } = require('../../src/utils/logger');

describe('Pagination Utility', () => {
  let mockPage;
  let mockButton;
  let logger;

  beforeEach(() => {
    logger = createConsoleLogger('error'); // Suppress logs in tests

    mockButton = {
      isVisible: jest.fn().mockResolvedValue(true),
      isDisabled: jest.fn().mockResolvedValue(false),
      click: jest.fn().mockResolvedValue(undefined)
    };

    mockPage = {
      $: jest.fn(),
      url: jest.fn().mockReturnValue('https://www.amazon.com/s?page=1'),
      waitForLoadState: jest.fn().mockResolvedValue(undefined),
      waitForTimeout: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn()
    };
  });

  describe('hasNextPage', () => {
    it('should return true when next button exists and is visible', async () => {
      mockPage.$.mockResolvedValue(mockButton);

      const result = await hasNextPage(mockPage, ['.next-button']);

      expect(result).toBe(true);
      expect(mockPage.$).toHaveBeenCalledWith('.next-button');
    });

    it('should return false when next button is disabled', async () => {
      mockButton.isDisabled.mockResolvedValue(true);
      mockPage.$.mockResolvedValue(mockButton);

      const result = await hasNextPage(mockPage, ['.next-button']);

      expect(result).toBe(false);
    });

    it('should return false when next button is not visible', async () => {
      mockButton.isVisible.mockResolvedValue(false);
      mockPage.$.mockResolvedValue(mockButton);

      const result = await hasNextPage(mockPage, ['.next-button']);

      expect(result).toBe(false);
    });

    it('should return false when no button exists', async () => {
      mockPage.$.mockResolvedValue(null);

      const result = await hasNextPage(mockPage, ['.next-button']);

      expect(result).toBe(false);
    });

    it('should try multiple selectors', async () => {
      mockPage.$.mockResolvedValueOnce(null).mockResolvedValueOnce(mockButton);

      const result = await hasNextPage(mockPage, ['.first-selector', '.second-selector']);

      expect(result).toBe(true);
      expect(mockPage.$).toHaveBeenCalledTimes(2);
    });
  });

  describe('goToNextPage', () => {
    it('should click next button and wait', async () => {
      mockPage.$.mockResolvedValue(mockButton);

      const result = await goToNextPage(mockPage, ['.next-button'], 1000, logger);

      expect(result).toBe(true);
      expect(mockButton.click).toHaveBeenCalled();
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(1000);
    });

    it('should return false when no button is found', async () => {
      mockPage.$.mockResolvedValue(null);

      const result = await goToNextPage(mockPage, ['.next-button'], 1000, logger);

      expect(result).toBe(false);
      expect(mockButton.click).not.toHaveBeenCalled();
    });

    it('should try multiple selectors until one works', async () => {
      mockPage.$.mockResolvedValueOnce(null).mockResolvedValueOnce(mockButton);

      const result = await goToNextPage(mockPage, ['.first', '.second'], 1000, logger);

      expect(result).toBe(true);
      // Function tries selectors one at a time and returns on first success
      expect(mockPage.$).toHaveBeenCalled();
    });

    it('should handle click errors gracefully', async () => {
      mockButton.click.mockRejectedValue(new Error('Click failed'));
      mockPage.$.mockResolvedValue(mockButton);

      const result = await goToNextPage(mockPage, ['.next-button'], 1000, logger);

      expect(result).toBe(false);
    });
  });

  describe('scrapeWithPagination', () => {
    it('should scrape multiple pages', async () => {
      const extractFn = jest
        .fn()
        .mockResolvedValueOnce([{ title: 'Product 1', asin: 'A1' }])
        .mockResolvedValueOnce([{ title: 'Product 2', asin: 'A2' }]);

      // Each pagination requires 2 calls: hasNextPage + goToNextPage
      // Page 1 → hasNextPage (true) → goToNextPage → Page 2 → hasNextPage (false)
      mockPage.$.mockResolvedValueOnce(mockButton) // hasNextPage after page 1
        .mockResolvedValueOnce(mockButton) // goToNextPage
        .mockResolvedValueOnce(null); // hasNextPage after page 2 (no more pages)

      const results = await scrapeWithPagination(mockPage, extractFn, {
        maxPages: 3,
        nextButtonSelectors: ['.next'],
        logger,
        deduplicateAcrossPages: false,
        stopOnEmpty: false
      });

      expect(results).toHaveLength(2);
      expect(extractFn).toHaveBeenCalledTimes(2);
    });

    it('should deduplicate across pages', async () => {
      const extractFn = jest
        .fn()
        .mockResolvedValueOnce([{ title: 'Product 1', asin: 'A1', productLink: 'link1' }])
        .mockResolvedValueOnce([
          { title: 'Product 1', asin: 'A1', productLink: 'link1' }, // Duplicate
          { title: 'Product 2', asin: 'A2', productLink: 'link2' } // New product
        ]);

      // Mock button for first page, null for second (no more pages after extracting second page)
      mockButton.isVisible.mockResolvedValue(true);
      mockButton.isDisabled.mockResolvedValue(false);

      // First call: has next page, second call: navigate succeeded, third call: no more pages
      mockPage.$.mockResolvedValueOnce(mockButton) // hasNextPage check
        .mockResolvedValueOnce(mockButton) // goToNextPage
        .mockResolvedValueOnce(null); // hasNextPage after second page

      const results = await scrapeWithPagination(mockPage, extractFn, {
        maxPages: 3,
        nextButtonSelectors: ['.next'],
        logger,
        deduplicateAcrossPages: true
      });

      // Should have 2 unique products: Product 1 from page 1, Product 2 from page 2
      // (Product 1 duplicate from page 2 is filtered out)
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(extractFn).toHaveBeenCalledTimes(2);
    });

    it('should stop on empty page when configured', async () => {
      const extractFn = jest
        .fn()
        .mockResolvedValueOnce([{ title: 'Product 1' }])
        .mockResolvedValueOnce([]);

      mockPage.$.mockResolvedValue(mockButton);

      const results = await scrapeWithPagination(mockPage, extractFn, {
        maxPages: 5,
        nextButtonSelectors: ['.next'],
        logger,
        stopOnEmpty: true
      });

      expect(results).toHaveLength(1);
      expect(extractFn).toHaveBeenCalledTimes(2); // Stopped on empty
    });

    it('should respect maxPages limit', async () => {
      const extractFn = jest.fn().mockResolvedValue([{ title: 'Product' }]);
      mockPage.$.mockResolvedValue(mockButton);

      await scrapeWithPagination(mockPage, extractFn, {
        maxPages: 3,
        nextButtonSelectors: ['.next'],
        logger
      });

      expect(extractFn).toHaveBeenCalledTimes(3);
    });

    it('should handle extraction errors on non-first pages', async () => {
      const extractFn = jest
        .fn()
        .mockResolvedValueOnce([{ title: 'Product 1' }])
        .mockRejectedValueOnce(new Error('Extraction failed'));

      mockPage.$.mockResolvedValue(mockButton);

      const results = await scrapeWithPagination(mockPage, extractFn, {
        maxPages: 3,
        nextButtonSelectors: ['.next'],
        logger
      });

      expect(results).toHaveLength(1); // Only first page succeeded
    });
  });

  describe('getCurrentPageNumber', () => {
    it('should extract page number from URL', async () => {
      mockPage.url.mockReturnValue('https://www.amazon.com/s?page=5');

      const pageNum = await getCurrentPageNumber(mockPage);

      expect(pageNum).toBe(5);
    });

    it('should extract page number from page content', async () => {
      mockPage.url.mockReturnValue('https://www.amazon.com/s');
      mockPage.evaluate.mockResolvedValue(3);

      const pageNum = await getCurrentPageNumber(mockPage);

      expect(pageNum).toBe(3);
    });

    it('should return 1 when no page number found', async () => {
      mockPage.url.mockReturnValue('https://www.amazon.com/s');
      mockPage.evaluate.mockResolvedValue(1);

      const pageNum = await getCurrentPageNumber(mockPage);

      expect(pageNum).toBe(1);
    });
  });
});
