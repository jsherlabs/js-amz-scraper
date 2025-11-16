/**
 * Amazon Reviews Scraper
 *
 * Scrapes customer reviews from Amazon product review pages
 */

require('dotenv').config();

const { chromium } = require('playwright');
const config = require('../config/scraper.config');
const { createConsoleLogger } = require('../utils/logger');
const { retryPageOperation, retryNetworkOperation } = require('../utils/retry');
const { NavigationError } = require('../utils/errors');

/**
 * Scrape reviews for a product
 * @param {string} asinOrUrl - Product ASIN or review page URL
 * @param {Object} options - Scraping options
 * @returns {Promise<Object>} - Reviews data with metadata
 */
async function scrapeReviews(asinOrUrl, options = {}) {
  const {
    logger = createConsoleLogger(config.logging.level),
    maxPages = 5,
    ...customConfig
  } = options;

  const finalConfig = { ...config, ...customConfig };

  // Build review URL from ASIN if needed
  let reviewUrl;
  if (asinOrUrl.startsWith('http')) {
    reviewUrl = asinOrUrl;
  } else {
    // Assume it's an ASIN
    reviewUrl = `https://www.amazon.com/product-reviews/${asinOrUrl}/`;
  }

  let browser;

  try {
    // Launch browser
    logger.info('Launching browser for review scraping...');
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

    // Navigate to review page
    logger.info(`Navigating to reviews at ${reviewUrl}...`);
    await retryPageOperation(
      async () => {
        try {
          await page.goto(reviewUrl, {
            waitUntil: finalConfig.scraping.waitForNetworkIdle ? 'networkidle' : 'load',
            timeout: finalConfig.timeouts.navigation
          });
        } catch (error) {
          throw new NavigationError(reviewUrl, error);
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
      await page.waitForTimeout(1000);
    } catch (_e) {
      logger.debug('No cookie banner found');
    }

    await page.waitForTimeout(2000);

    // Extract summary data
    logger.info('Extracting review summary...');
    const summary = await extractReviewSummary(page);

    // Extract reviews from multiple pages
    const allReviews = [];
    let currentPage = 1;

    while (currentPage <= maxPages) {
      logger.info(`Scraping reviews page ${currentPage}/${maxPages}...`);

      const pageReviews = await extractReviews(page, logger);
      allReviews.push(...pageReviews);

      logger.info(`Found ${pageReviews.length} reviews on page ${currentPage}`);

      if (currentPage >= maxPages) {
        break;
      }

      // Check for next page
      const hasNext = await hasNextReviewPage(page);
      if (!hasNext) {
        logger.info('No more review pages available');
        break;
      }

      // Click next page
      const navigated = await goToNextReviewPage(page, logger);
      if (!navigated) {
        logger.warn('Failed to navigate to next review page');
        break;
      }

      await page.waitForTimeout(2000);
      currentPage++;
    }

    logger.info(`Scraped ${allReviews.length} total reviews from ${currentPage} page(s)`);

    return {
      asin: extractAsinFromUrl(reviewUrl),
      url: reviewUrl,
      summary,
      reviews: allReviews,
      totalReviews: allReviews.length,
      scrapedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Error scraping reviews: ${error.message}`);
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
 * Extract review summary (overall rating, distribution, etc.)
 * @param {Page} page - Playwright page
 * @returns {Promise<Object>} - Summary data
 */
async function extractReviewSummary(page) {
  /* eslint-disable no-undef */
  return await page.evaluate(() => {
    const summary = {
      overallRating: '',
      totalReviews: '',
      ratingDistribution: {}
    };

    // Overall rating
    const ratingElement =
      document.querySelector('[data-hook="rating-out-of-text"]') ||
      document.querySelector('.averageStarRating span');
    summary.overallRating = ratingElement ? ratingElement.textContent.trim() : '';

    // Total reviews
    const totalElement = document.querySelector('[data-hook="total-review-count"]');
    summary.totalReviews = totalElement ? totalElement.textContent.trim() : '';

    // Rating distribution
    const histogramRows = document.querySelectorAll('[data-hook="histogram-row"]');
    histogramRows.forEach((row) => {
      const stars = row.querySelector('.a-size-small')?.textContent.trim();
      const percentage = row.querySelector('.a-size-medium')?.textContent.trim();
      const count = row.querySelector('.a-size-base')?.textContent.trim();

      if (stars) {
        summary.ratingDistribution[stars] = {
          percentage: percentage || '',
          count: count || ''
        };
      }
    });

    return summary;
  });
  /* eslint-enable no-undef */
}

/**
 * Extract reviews from current page
 * @param {Page} page - Playwright page
 * @param {Object} logger - Logger
 * @returns {Promise<Array>} - Array of reviews
 */
async function extractReviews(page, logger) {
  /* eslint-disable no-undef */
  const reviews = await page.evaluate(() => {
    const reviewElements = document.querySelectorAll('[data-hook="review"]');
    const results = [];

    reviewElements.forEach((element) => {
      const review = {
        id: '',
        author: '',
        authorProfile: '',
        rating: '',
        title: '',
        text: '',
        date: '',
        verifiedPurchase: false,
        helpfulVotes: '',
        images: [],
        variant: ''
      };

      // Review ID
      review.id = element.getAttribute('id') || '';

      // Author
      const authorElement = element.querySelector('[data-hook="review-author"]');
      review.author = authorElement ? authorElement.textContent.trim() : '';

      // Author profile link
      const authorLink = element.querySelector('[data-hook="review-author"] a');
      review.authorProfile = authorLink ? authorLink.getAttribute('href') : '';

      // Rating
      const ratingElement = element.querySelector('[data-hook="review-star-rating"]');
      review.rating = ratingElement ? ratingElement.textContent.trim() : '';

      // Title
      const titleElement = element.querySelector('[data-hook="review-title"]');
      review.title = titleElement ? titleElement.textContent.trim() : '';

      // Review text
      const textElement = element.querySelector('[data-hook="review-body"]');
      review.text = textElement ? textElement.textContent.trim() : '';

      // Date
      const dateElement = element.querySelector('[data-hook="review-date"]');
      review.date = dateElement ? dateElement.textContent.trim() : '';

      // Verified Purchase
      const verifiedElement = element.querySelector('[data-hook="avp-badge"]');
      review.verifiedPurchase = !!verifiedElement;

      // Helpful votes
      const helpfulElement = element.querySelector('[data-hook="helpful-vote-statement"]');
      review.helpfulVotes = helpfulElement ? helpfulElement.textContent.trim() : '';

      // Review images
      const imageElements = element.querySelectorAll('[data-hook="review-image-tile"] img');
      imageElements.forEach((img) => {
        const src = img.getAttribute('src') || img.src;
        if (src) {
          review.images.push(src);
        }
      });

      // Product variant (color, size, etc.)
      const variantElement = element.querySelector('[data-hook="format-strip"]');
      review.variant = variantElement ? variantElement.textContent.trim() : '';

      results.push(review);
    });

    return results;
  });
  /* eslint-enable no-undef */

  logger.debug(`Extracted ${reviews.length} reviews from page`);
  return reviews;
}

/**
 * Check if there's a next page of reviews
 * @param {Page} page - Playwright page
 * @returns {Promise<boolean>}
 */
async function hasNextReviewPage(page) {
  try {
    const nextButton = await page.$('li.a-last:not(.a-disabled) a');
    return !!nextButton;
  } catch (_error) {
    return false;
  }
}

/**
 * Navigate to next page of reviews
 * @param {Page} page - Playwright page
 * @param {Object} logger - Logger
 * @returns {Promise<boolean>}
 */
async function goToNextReviewPage(page, logger) {
  try {
    const nextButton = await page.$('li.a-last:not(.a-disabled) a');
    if (!nextButton) {
      return false;
    }

    await Promise.all([
      page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        logger.debug('Network idle timeout');
      }),
      nextButton.click()
    ]);

    return true;
  } catch (error) {
    logger.warn(`Failed to click next page: ${error.message}`);
    return false;
  }
}

/**
 * Extract ASIN from review URL
 * @param {string} url - Review URL
 * @returns {string} - ASIN
 */
function extractAsinFromUrl(url) {
  const match = url.match(/\/product-reviews\/([A-Z0-9]{10})/);
  return match ? match[1] : '';
}

// CLI execution
if (require.main === module) {
  const asinOrUrl = process.argv[2];
  const maxPages = parseInt(process.argv[3] || '5', 10);

  if (!asinOrUrl) {
    console.error('Usage: node amazon_reviews.js <asin_or_url> [max_pages]');
    console.error('Example: node amazon_reviews.js B0123456789 10');
    console.error(
      'Example: node amazon_reviews.js "https://www.amazon.com/product-reviews/B0123456789/" 5'
    );
    process.exit(1);
  }

  scrapeReviews(asinOrUrl, { maxPages })
    .then((data) => {
      console.log('\n✓ Reviews scraped successfully!\n');
      console.log(`Total reviews: ${data.totalReviews}`);
      console.log(`Overall rating: ${data.summary.overallRating}`);
      console.log('\nFirst 3 reviews:');
      console.log(JSON.stringify(data.reviews.slice(0, 3), null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Scraping failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  scrapeReviews,
  extractAsinFromUrl
};
