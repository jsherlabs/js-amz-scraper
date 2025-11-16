/**
 * Pagination Utility
 *
 * Handles multi-page scraping with automatic "Next" button detection
 */

const { retryPageOperation } = require('./retry');
const { createConsoleLogger } = require('./logger');

/**
 * Check if a next page button exists and is clickable
 * @param {Page} page - Playwright page object
 * @param {Array<string>} selectors - Array of possible next button selectors
 * @returns {Promise<boolean>} - True if next button exists
 */
async function hasNextPage(page, selectors) {
  for (const selector of selectors) {
    try {
      const button = await page.$(selector);
      if (button) {
        const isVisible = await button.isVisible();
        const isDisabled = await button.isDisabled().catch(() => false);

        if (isVisible && !isDisabled) {
          return true;
        }
      }
    } catch (_error) {
      continue;
    }
  }
  return false;
}

/**
 * Navigate to the next page
 * @param {Page} page - Playwright page object
 * @param {Array<string>} selectors - Array of possible next button selectors
 * @param {number} waitAfterClick - Milliseconds to wait after clicking
 * @param {Object} logger - Logger instance
 * @returns {Promise<boolean>} - True if navigation succeeded
 */
async function goToNextPage(
  page,
  selectors,
  waitAfterClick = 3000,
  logger = createConsoleLogger('info')
) {
  for (const selector of selectors) {
    try {
      const button = await page.$(selector);
      if (button) {
        const isVisible = await button.isVisible();
        const isDisabled = await button.isDisabled().catch(() => false);

        if (isVisible && !isDisabled) {
          logger.debug(`Clicking next page button: ${selector}`);

          // Click and wait for navigation
          await Promise.all([
            page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
              logger.debug('Network idle timeout, continuing anyway');
            }),
            button.click()
          ]);

          // Additional wait for content to load
          await page.waitForTimeout(waitAfterClick);

          logger.debug('Navigated to next page successfully');
          return true;
        }
      }
    } catch (error) {
      logger.debug(`Failed to click selector ${selector}: ${error.message}`);
      continue;
    }
  }

  return false;
}

/**
 * Scrape multiple pages with pagination
 * @param {Page} page - Playwright page object
 * @param {Function} extractFn - Function to extract data from current page
 * @param {Object} options - Pagination options
 * @returns {Promise<Array>} - Combined results from all pages
 */
async function scrapeWithPagination(page, extractFn, options = {}) {
  const {
    maxPages = 5,
    nextButtonSelectors = [
      'a.s-pagination-next',
      '.s-pagination-next',
      'li.a-last a',
      'a[aria-label="Next"]',
      'a[title="Next"]'
    ],
    waitAfterClick = 3000,
    logger = createConsoleLogger('info'),
    stopOnEmpty = true,
    deduplicateAcrossPages = true
  } = options;

  const allResults = [];
  const seenKeys = new Set();
  let currentPage = 1;

  while (currentPage <= maxPages) {
    logger.info(`Scraping page ${currentPage}/${maxPages}...`);

    try {
      // Extract data from current page
      const pageResults = await extractFn(page);

      if (!pageResults || pageResults.length === 0) {
        logger.warn(`No products found on page ${currentPage}`);
        if (stopOnEmpty && currentPage > 1) {
          logger.info('Stopping pagination due to empty page');
          break;
        }
      } else {
        logger.info(`Found ${pageResults.length} products on page ${currentPage}`);

        // Deduplicate if enabled
        if (deduplicateAcrossPages) {
          let addedCount = 0;
          for (const result of pageResults) {
            const key = `${result.asin || ''}-${result.title || ''}-${result.productLink || ''}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              allResults.push(result);
              addedCount++;
            }
          }
          logger.info(
            `Added ${addedCount} new unique products (${pageResults.length - addedCount} duplicates)`
          );
        } else {
          allResults.push(...pageResults);
        }
      }

      // Check if there's a next page
      if (currentPage >= maxPages) {
        logger.info('Reached maximum page limit');
        break;
      }

      const hasNext = await hasNextPage(page, nextButtonSelectors);
      if (!hasNext) {
        logger.info('No more pages available');
        break;
      }

      // Navigate to next page with retry
      logger.info('Navigating to next page...');
      const navigated = await retryPageOperation(
        async () => await goToNextPage(page, nextButtonSelectors, waitAfterClick, logger),
        'Pagination navigation',
        logger,
        { maxAttempts: 2 }
      );

      if (!navigated) {
        logger.warn('Failed to navigate to next page, stopping pagination');
        break;
      }

      currentPage++;
    } catch (error) {
      logger.error(`Error on page ${currentPage}: ${error.message}`);
      if (currentPage === 1) {
        throw error; // Re-throw on first page
      }
      logger.warn('Continuing with results from previous pages');
      break;
    }
  }

  logger.info(
    `Pagination complete. Total products collected: ${allResults.length} from ${currentPage} page(s)`
  );
  return allResults;
}

/**
 * Extract page number from URL or content
 * @param {Page} page - Playwright page object
 * @returns {Promise<number>} - Current page number
 */
async function getCurrentPageNumber(page) {
  try {
    // Try to extract from URL
    const url = page.url();
    const pageMatch = url.match(/[?&]page=(\d+)/i);
    if (pageMatch) {
      return parseInt(pageMatch[1], 10);
    }

    // Try to extract from page content
    /* eslint-disable no-undef */
    const pageNumber = await page.evaluate(() => {
      const currentPageElement = document.querySelector('.s-pagination-selected, .a-selected');
      if (currentPageElement) {
        const text = currentPageElement.textContent.trim();
        const num = parseInt(text, 10);
        if (!isNaN(num)) return num;
      }
      return 1;
    });
    /* eslint-enable no-undef */

    return pageNumber;
  } catch (_error) {
    return 1;
  }
}

module.exports = {
  hasNextPage,
  goToNextPage,
  scrapeWithPagination,
  getCurrentPageNumber
};
