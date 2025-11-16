/**
 * Amazon Scraper V3 - Feature-Rich with Pagination, Multi-Format Export, and Resume
 *
 * New features in V3:
 * - Pagination support (multi-page scraping)
 * - Multiple export formats (CSV, JSON, Excel)
 * - Rate limiting
 * - Resume capability
 * - Concurrent URL processing
 */

require('dotenv').config();

const { chromium } = require('playwright');
const config = require('../config/scraper.config');
const { createConsoleLogger } = require('../utils/logger');
const { retryPageOperation, retryNetworkOperation } = require('../utils/retry');
const { NavigationError, NoProductsFoundError } = require('../utils/errors');
const { validateProducts, isAmazonUrl, sanitizeProduct } = require('../utils/validator');
const { scrapeWithPagination } = require('../utils/pagination');
const { exportToMultipleFormats } = require('../utils/exporter');
const { createRateLimiter } = require('../utils/rate-limiter');
const { createResumeManager } = require('../utils/resume');

/**
 * Main scraping function with all V3 features
 * @param {string|Array<string>} urlOrUrls - Single URL or array of URLs
 * @param {string} outputFilename - Output filename (without extension if using multiple formats)
 * @param {Object} options - Scraping options
 * @returns {Promise<Object>} - Scraping results
 */
async function scrapeAmazon(urlOrUrls, outputFilename = null, options = {}) {
  const {
    logger = createConsoleLogger(config.logging.level),
    validateData = true,
    enablePagination = config.pagination.enabled,
    exportFormats = config.export.formats,
    enableRateLimit = config.rateLimit.enabled,
    enableResume = config.resume.enabled,
    ...customConfig
  } = options;

  const finalConfig = { ...config, ...customConfig };
  const filename = outputFilename || finalConfig.output.defaultFilename.replace(/\.\w+$/, '');

  // Handle multiple URLs
  const urls = Array.isArray(urlOrUrls) ? urlOrUrls : [urlOrUrls];
  logger.info(`Starting V3 scraper for ${urls.length} URL(s)`);

  // Initialize utilities
  const rateLimiter = enableRateLimit ? createRateLimiter() : null;
  const resumeManager = enableResume ? createResumeManager({ logger }) : null;

  // Initialize resume state
  if (resumeManager) {
    await resumeManager.initialize();
  }

  const allProducts = [];
  let browser;

  try {
    // Launch browser
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

    // Process each URL
    for (const url of urls) {
      // Skip if already processed (resume functionality)
      if (resumeManager && resumeManager.isUrlProcessed(url)) {
        logger.info(`Skipping already processed URL: ${url}`);
        continue;
      }

      // Rate limiting
      if (rateLimiter && urls.length > 1) {
        await rateLimiter.wait();
      }

      // Validate URL
      if (!isAmazonUrl(url)) {
        logger.warn(`URL may not be an Amazon domain: ${url}`);
      }

      logger.info(`Processing URL: ${url}`);
      if (resumeManager) {
        resumeManager.setCurrentUrl(url);
      }

      try {
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

        await page.waitForTimeout(finalConfig.timeouts.pageLoad);

        // Extract products (with or without pagination)
        let products;
        if (enablePagination) {
          logger.info('Pagination enabled, scraping multiple pages...');
          products = await scrapeWithPagination(
            page,
            async (p) => await extractProducts(p, finalConfig, logger),
            {
              maxPages: finalConfig.pagination.maxPages,
              nextButtonSelectors: finalConfig.pagination.nextButtonSelectors,
              waitAfterClick: finalConfig.pagination.waitAfterClick,
              logger,
              stopOnEmpty: finalConfig.pagination.stopOnEmpty,
              deduplicateAcrossPages: finalConfig.pagination.deduplicateAcrossPages
            }
          );
        } else {
          logger.info('Extracting product data...');
          products = await extractProducts(page, finalConfig, logger);
        }

        await page.close();

        if (!products || products.length === 0) {
          throw new NoProductsFoundError(url);
        }

        logger.info(`Found ${products.length} products from ${url}`);
        allProducts.push(...products);

        // Mark URL as processed
        if (resumeManager) {
          resumeManager.markUrlProcessed(url, true);
          resumeManager.addProducts(products);
        }
      } catch (error) {
        logger.error(`Failed to scrape ${url}: ${error.message}`);
        if (resumeManager) {
          resumeManager.markUrlProcessed(url, false);
        }
        if (!finalConfig.concurrency.continueOnError) {
          throw error;
        }
      }
    }

    // Deduplicate across all URLs
    const uniqueProducts = deduplicateProducts(allProducts, logger);
    logger.info(`Total unique products after deduplication: ${uniqueProducts.length}`);

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

    // Export to multiple formats
    if (finalProducts.length > 0) {
      logger.info(`Exporting ${finalProducts.length} products...`);

      const exportedFiles = await exportToMultipleFormats(
        finalProducts,
        filename,
        exportFormats,
        {
          pretty: finalConfig.export.jsonPretty,
          includeMetadata: finalConfig.export.includeMetadata,
          sheetName: finalConfig.export.excelSheetName,
          continueOnError: true
        },
        logger
      );

      logger.info(`Exported to ${exportedFiles.length} format(s): ${exportedFiles.join(', ')}`);

      // Log sample data
      const sampleSize = Math.min(finalConfig.output.sampleSize, finalProducts.length);
      logger.debug('\nSample data:');
      logger.debug(JSON.stringify(finalProducts.slice(0, sampleSize), null, 2));
    } else {
      logger.warn('No valid products to export');
    }

    // Finalize resume state
    if (resumeManager) {
      await resumeManager.finalize(true);
    }

    return {
      success: true,
      totalProducts: finalProducts.length,
      urls: urls.length,
      formats: exportFormats,
      products: finalProducts
    };
  } catch (error) {
    logger.error(`Error during scraping: ${error.message}`);
    if (error.stack) {
      logger.debug(error.stack);
    }

    // Save resume state on error
    if (resumeManager) {
      await resumeManager.checkpoint();
      logger.info('Progress saved. You can resume later.');
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
 * Extract products from page (same as V2)
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
 * Remove duplicate products (same as V2)
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
  const args = process.argv.slice(2);
  const url = args[0];
  const outputFile = args[1];

  if (!url) {
    console.error('Usage: node amazon_scraper_v3.js <amazon_url> [output_filename]');
    console.error('Example: node amazon_scraper_v3.js "https://www.amazon.com/..." output');
    console.error('\nV3 Features:');
    console.error('  - Multi-page scraping (set ENABLE_PAGINATION=true)');
    console.error('  - Multiple export formats (set EXPORT_FORMATS=csv,json,xlsx)');
    console.error('  - Rate limiting (set ENABLE_RATE_LIMIT=true)');
    console.error('  - Resume capability (set ENABLE_RESUME=true)');
    process.exit(1);
  }

  scrapeAmazon(url, outputFile)
    .then((result) => {
      console.log('\n✓ Scraping completed successfully!');
      console.log(`  Products: ${result.totalProducts}`);
      console.log(`  Formats: ${result.formats.join(', ')}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Scraping failed:', error.message);
      process.exit(1);
    });
}

module.exports = { scrapeAmazon };
