/**
 * Amazon Scraper V2 - Enhanced with Retry, Logging, and Configuration
 *
 * This version includes:
 * - Retry logic with exponential backoff
 * - Proper error handling with custom error classes
 * - Winston-based logging
 * - Configuration management
 * - Data validation
 */

require('dotenv').config();

const { chromium } = require('playwright');
const ObjectsToCsv = require('objects-to-csv');
const config = require('../config/scraper.config');
const { createConsoleLogger } = require('../utils/logger');
const { retryPageOperation, retryNetworkOperation } = require('../utils/retry');
const {
  NavigationError,
  NoProductsFoundError
  // PageLoadError, BrowserError - Reserved for future use
} = require('../utils/errors');
const { validateProducts, isAmazonUrl, sanitizeProduct } = require('../utils/validator');

async function scrapeAmazon(url, outputFilename = null, options = {}) {
  const {
    logger = createConsoleLogger(config.logging.level),
    validateData = true,
    ...customConfig
  } = options;

  const finalConfig = { ...config, ...customConfig };
  const filename = outputFilename || finalConfig.output.defaultFilename;

  // Validate URL
  if (!isAmazonUrl(url)) {
    logger.warn(`URL may not be an Amazon domain: ${url}`);
  }

  let browser;

  try {
    // Launch browser with retry
    logger.info('Launching browser...');
    browser = await retryNetworkOperation(
      async () => {
        return await chromium.launch({
          headless: finalConfig.browser.headless,
          args: finalConfig.browser.args
        });
      },
      'Browser launch',
      logger
    );

    const context = await browser.newContext({
      userAgent: finalConfig.browser.userAgent,
      viewport: finalConfig.browser.viewport,
      locale: finalConfig.browser.locale,
      timezoneId: finalConfig.browser.timezoneId
    });

    const page = await context.newPage();

    // Navigate to URL with retry
    logger.info(`Navigating to ${url}...`);
    await retryPageOperation(
      async () => {
        try {
          await page.goto(url, {
            waitUntil: finalConfig.scraping.waitForNetworkIdle ? 'networkidle' : 'load',
            timeout: finalConfig.timeouts.navigation
          });
        } catch (error) {
          throw new NavigationError(url, error);
        }
      },
      'Navigation',
      logger
    );

    logger.debug('Page loaded successfully');

    // Handle cookie banner
    try {
      await page.click(finalConfig.selectors.cookieBanner, {
        timeout: finalConfig.timeouts.cookieBanner
      });
      logger.info('Cookie banner dismissed');
      await page.waitForTimeout(2000);
    } catch (_e) {
      logger.debug('No cookie banner found or already dismissed');
    }

    // Wait for product grid
    try {
      await page.waitForSelector(finalConfig.selectors.productGrid, {
        timeout: finalConfig.timeouts.productGrid
      });
      logger.info('Product grid loaded');
    } catch (_e) {
      logger.warn('Product grid not found, continuing anyway');
    }

    // Wait for page to fully load
    await page.waitForTimeout(finalConfig.timeouts.pageLoad);

    // Extract product data
    logger.info('Extracting product data...');
    const scrapedData = await extractProducts(page, finalConfig, logger);

    if (!scrapedData || scrapedData.length === 0) {
      throw new NoProductsFoundError(url);
    }

    logger.info(`Found ${scrapedData.length} products`);

    // Deduplicate products
    const uniqueProducts = deduplicateProducts(scrapedData, logger);
    logger.info(`After removing duplicates: ${uniqueProducts.length} products`);

    // Validate products if enabled
    let finalProducts = uniqueProducts;
    if (validateData) {
      const { valid, invalid } = validateProducts(uniqueProducts, {
        throwOnInvalid: false,
        logInvalid: true
      });

      if (invalid.length > 0) {
        logger.warn(`${invalid.length} products failed validation`);
      }

      finalProducts = valid;
    }

    // Save to CSV
    if (finalProducts.length > 0) {
      const csv = new ObjectsToCsv(finalProducts);
      await csv.toDisk(`./${filename}`);
      logger.info(`Data saved to ${filename}`);

      // Log sample data
      const sampleSize = Math.min(finalConfig.output.sampleSize, finalProducts.length);
      logger.debug('\nSample data:');
      logger.debug(JSON.stringify(finalProducts.slice(0, sampleSize), null, 2));
    } else {
      logger.warn('No valid products to save');
    }

    return finalProducts;
  } catch (error) {
    logger.error(`Error during scraping: ${error.message}`);
    if (error.stack) {
      logger.debug(error.stack);
    }
    throw error;
  } finally {
    if (browser) {
      try {
        await browser.close();
        logger.debug('Browser closed');
      } catch (error) {
        logger.error(`Error closing browser: ${error.message}`);
      }
    }
  }
}

/**
 * Extract products from page
 */
async function extractProducts(page, config, _logger) {
  /* eslint-disable no-undef */
  const products = await page.evaluate(
    ({ selectors, scraping }) => {
      const results = [];

      // Primary extraction strategy
      const productElements = document.querySelectorAll(selectors.productElements);

      productElements.forEach((element) => {
        let titleElement = element.querySelector(selectors.title);
        if (!titleElement) {
          titleElement = element.querySelector(selectors.titleFallback);
        }
        if (!titleElement) {
          const link = element.querySelector(selectors.link);
          if (link) titleElement = link;
        }

        let priceElement = element.querySelector(selectors.price);
        if (!priceElement) {
          priceElement = element.querySelector(selectors.priceFallback);
        }

        const imageElement = element.querySelector(selectors.image);
        const linkElement = element.querySelector(selectors.link);

        const title = titleElement ? titleElement.textContent.trim() : '';
        const price = priceElement ? priceElement.textContent.trim() : '';
        const imageUrl = imageElement
          ? imageElement.src ||
            imageElement.dataset.src ||
            imageElement.getAttribute('data-src') ||
            ''
          : '';
        const productLink = linkElement ? linkElement.href : '';

        let asin = element.getAttribute('data-asin') || '';
        if (!asin && linkElement && linkElement.href) {
          const asinMatch = linkElement.href.match(/\/dp\/([A-Z0-9]{10})/);
          if (asinMatch) {
            asin = asinMatch[1];
          }
        }

        if (title || price || imageUrl || productLink) {
          results.push({
            title,
            price,
            imageUrl,
            productLink,
            asin
          });
        }
      });

      // Fallback extraction strategy
      if (results.length === 0) {
        const allElements = document.querySelectorAll(selectors.genericContainers);
        let foundCount = 0;

        allElements.forEach((element) => {
          if (foundCount >= scraping.maxFallbackProducts) return;

          const hasImage = element.querySelector(selectors.image);
          const hasLink = element.querySelector(selectors.link);
          const hasPrice =
            element.querySelector(selectors.price) || element.textContent.match(/£\d+|\$\d+/);

          if (hasImage && (hasLink || hasPrice)) {
            const titleElement = element.querySelector(selectors.genericTitle);
            const priceElement = element.querySelector(selectors.price);
            const imageElement = element.querySelector(selectors.image);
            const linkElement = element.querySelector(selectors.link);

            const title = titleElement ? titleElement.textContent.trim() : '';
            const price = priceElement ? priceElement.textContent.trim() : '';
            const imageUrl = imageElement ? imageElement.src || imageElement.dataset.src || '' : '';
            const productLink = linkElement ? linkElement.href : '';

            if (title && title.length > scraping.minTitleLength) {
              results.push({
                title,
                price,
                imageUrl,
                productLink,
                asin: ''
              });
              foundCount++;
            }
          }
        });
      }

      return results;
    },
    { selectors: config.selectors, scraping: config.scraping }
  );
  /* eslint-enable no-undef */

  return products.map(sanitizeProduct);
}

/**
 * Remove duplicate products
 */
function deduplicateProducts(products, logger) {
  const uniqueProducts = [];
  const seen = new Set();

  for (const product of products) {
    const key = `${product.title}-${product.asin}-${product.productLink}`;
    if (!seen.has(key) && (product.title || product.asin)) {
      seen.add(key);
      uniqueProducts.push(product);
    } else {
      logger.debug(`Duplicate product skipped: ${product.title}`);
    }
  }

  return uniqueProducts;
}

// CLI execution
if (require.main === module) {
  const url = process.argv[2];
  const outputFile = process.argv[3];

  if (!url) {
    console.error('Usage: node amazon_scraper_v2.js <amazon_url> [output_filename.csv]');
    console.error(
      'Example: node amazon_scraper_v2.js "https://www.amazon.co.uk/stores/page/..." my_output.csv'
    );
    process.exit(1);
  }

  scrapeAmazon(url, outputFile)
    .then((products) => {
      console.log(`\nScraping completed successfully! Scraped ${products.length} products`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nScraping failed:', error.message);
      process.exit(1);
    });
}

module.exports = { scrapeAmazon };
