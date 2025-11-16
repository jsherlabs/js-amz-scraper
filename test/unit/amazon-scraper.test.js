const { scrapeAmazon } = require('../../src/scrapers/amazon_scraper_generic');
const { chromium } = require('playwright');
const ObjectsToCsv = require('objects-to-csv');

// Mock Playwright
jest.mock('playwright');

// Mock objects-to-csv
jest.mock('objects-to-csv');

describe('Amazon Scraper', () => {
  let mockBrowser;
  let mockContext;
  let mockPage;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock page
    mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      click: jest.fn().mockResolvedValue(undefined),
      waitForTimeout: jest.fn().mockResolvedValue(undefined),
      waitForSelector: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockResolvedValue([
        {
          title: 'Product 1',
          price: '$10.00',
          imageUrl: 'https://example.com/img1.jpg',
          productLink: 'https://amazon.com/dp/ASIN123456',
          asin: 'ASIN123456'
        },
        {
          title: 'Product 2',
          price: '$20.00',
          imageUrl: 'https://example.com/img2.jpg',
          productLink: 'https://amazon.com/dp/ASIN654321',
          asin: 'ASIN654321'
        }
      ])
    };

    // Setup mock context
    mockContext = {
      newPage: jest.fn().mockResolvedValue(mockPage)
    };

    // Setup mock browser
    mockBrowser = {
      newContext: jest.fn().mockResolvedValue(mockContext),
      close: jest.fn().mockResolvedValue(undefined)
    };

    // Setup chromium.launch mock
    chromium.launch.mockResolvedValue(mockBrowser);

    // Setup ObjectsToCsv mock
    const mockCsvInstance = {
      toDisk: jest.fn().mockResolvedValue(undefined)
    };
    ObjectsToCsv.mockImplementation(() => mockCsvInstance);
  });

  describe('scrapeAmazon function', () => {
    it('should successfully scrape products from Amazon URL', async () => {
      const url = 'https://www.amazon.co.uk/stores/page/test';
      const result = await scrapeAmazon(url);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Product 1');
      expect(result[1].title).toBe('Product 2');
    });

    it('should launch browser with correct configuration', async () => {
      const url = 'https://www.amazon.com/stores/page/test';
      await scrapeAmazon(url);

      expect(chromium.launch).toHaveBeenCalledWith({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    });

    it('should create browser context with correct settings', async () => {
      const url = 'https://www.amazon.com/stores/page/test';
      await scrapeAmazon(url);

      expect(mockBrowser.newContext).toHaveBeenCalledWith({
        userAgent: expect.stringContaining('Chrome'),
        viewport: { width: 1920, height: 1080 },
        locale: 'en-GB',
        timezoneId: 'Europe/London'
      });
    });

    it('should navigate to the provided URL', async () => {
      const url = 'https://www.amazon.co.uk/stores/page/test';
      await scrapeAmazon(url);

      expect(mockPage.goto).toHaveBeenCalledWith(url, {
        waitUntil: 'networkidle',
        timeout: 60000
      });
    });

    it('should attempt to dismiss cookie banner', async () => {
      const url = 'https://www.amazon.com/stores/page/test';
      await scrapeAmazon(url);

      expect(mockPage.click).toHaveBeenCalledWith('#sp-cc-accept', { timeout: 3000 });
    });

    it('should handle cookie banner not found gracefully', async () => {
      mockPage.click.mockRejectedValueOnce(new Error('Element not found'));

      const url = 'https://www.amazon.com/stores/page/test';
      const result = await scrapeAmazon(url);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should wait for product grid to load', async () => {
      const url = 'https://www.amazon.com/stores/page/test';
      await scrapeAmazon(url);

      expect(mockPage.waitForSelector).toHaveBeenCalledWith(
        '[class*="ProductGridItem"], [data-component-type="s-search-result"]',
        { timeout: 10000 }
      );
    });

    it('should save products to CSV with default filename', async () => {
      const url = 'https://www.amazon.com/stores/page/test';
      await scrapeAmazon(url);

      const mockCsvInstance = ObjectsToCsv.mock.results[0].value;
      expect(mockCsvInstance.toDisk).toHaveBeenCalledWith('./amazon_output.csv');
    });

    it('should save products to CSV with custom filename', async () => {
      const url = 'https://www.amazon.com/stores/page/test';
      const customFilename = 'custom_output.csv';
      await scrapeAmazon(url, customFilename);

      const mockCsvInstance = ObjectsToCsv.mock.results[0].value;
      expect(mockCsvInstance.toDisk).toHaveBeenCalledWith('./custom_output.csv');
    });

    it('should close browser even if scraping fails', async () => {
      mockPage.goto.mockRejectedValueOnce(new Error('Navigation failed'));

      const url = 'https://www.amazon.com/stores/page/test';

      await expect(scrapeAmazon(url)).rejects.toThrow('Navigation failed');
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should remove duplicate products', async () => {
      // Mock with duplicate products
      mockPage.evaluate.mockResolvedValueOnce([
        {
          title: 'Product 1',
          price: '$10.00',
          imageUrl: 'https://example.com/img1.jpg',
          productLink: 'https://amazon.com/dp/ASIN123456',
          asin: 'ASIN123456'
        },
        {
          title: 'Product 1',
          price: '$10.00',
          imageUrl: 'https://example.com/img1.jpg',
          productLink: 'https://amazon.com/dp/ASIN123456',
          asin: 'ASIN123456'
        },
        {
          title: 'Product 2',
          price: '$20.00',
          imageUrl: 'https://example.com/img2.jpg',
          productLink: 'https://amazon.com/dp/ASIN654321',
          asin: 'ASIN654321'
        }
      ]);

      const url = 'https://www.amazon.com/stores/page/test';
      const result = await scrapeAmazon(url);

      expect(result).toHaveLength(2);
    });

    it('should not save CSV when no products found', async () => {
      mockPage.evaluate.mockResolvedValueOnce([]);

      const url = 'https://www.amazon.com/stores/page/test';
      const result = await scrapeAmazon(url);

      expect(result).toHaveLength(0);
      expect(ObjectsToCsv).not.toHaveBeenCalled();
    });

    it('should return products with all expected fields', async () => {
      const url = 'https://www.amazon.com/stores/page/test';
      const result = await scrapeAmazon(url);

      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('price');
      expect(result[0]).toHaveProperty('imageUrl');
      expect(result[0]).toHaveProperty('productLink');
      expect(result[0]).toHaveProperty('asin');
    });

    it('should handle page evaluation errors', async () => {
      mockPage.evaluate.mockRejectedValueOnce(new Error('Evaluation failed'));

      const url = 'https://www.amazon.com/stores/page/test';

      await expect(scrapeAmazon(url)).rejects.toThrow('Evaluation failed');
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });
});
