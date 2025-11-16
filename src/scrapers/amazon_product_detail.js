/**
 * Amazon Product Detail Page Scraper
 *
 * Scrapes comprehensive product information from individual product pages (/dp/ASIN)
 */

require('dotenv').config();

const { chromium } = require('playwright');
const config = require('../config/scraper.config');
const { createConsoleLogger } = require('../utils/logger');
const { retryPageOperation, retryNetworkOperation } = require('../utils/retry');
const { NavigationError } = require('../utils/errors');

/**
 * Extract product details from a product page
 * @param {string} url - Amazon product URL (e.g., /dp/B0123456789)
 * @param {Object} options - Scraping options
 * @returns {Promise<Object>} - Product details
 */
async function scrapeProductDetail(url, options = {}) {
  const { logger = createConsoleLogger(config.logging.level), ...customConfig } = options;

  const finalConfig = { ...config, ...customConfig };
  let browser;

  try {
    // Launch browser
    logger.info('Launching browser for product detail scraping...');
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

    // Navigate to product page
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

    // Wait for page to load
    await page.waitForTimeout(finalConfig.timeouts.pageLoad);

    // Extract product data
    logger.info('Extracting product details...');
    const productData = await extractProductData(page, logger);

    // Extract ASIN from URL if not found in page
    if (!productData.asin) {
      const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
      if (asinMatch) {
        productData.asin = asinMatch[1];
      }
    }

    productData.url = url;
    productData.scrapedAt = new Date().toISOString();

    logger.info(`Successfully scraped product: ${productData.title}`);
    return productData;
  } catch (error) {
    logger.error(`Error scraping product detail: ${error.message}`);
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
 * Extract comprehensive product data from page
 * @param {Page} page - Playwright page object
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} - Product data
 */
async function extractProductData(page, logger) {
  /* eslint-disable no-undef */
  const data = await page.evaluate(() => {
    const result = {
      // Basic Information
      title: '',
      asin: '',
      brand: '',
      manufacturer: '',

      // Pricing
      price: '',
      listPrice: '',
      currency: '',
      discount: '',
      dealPrice: '',

      // Availability
      availability: '',
      inStock: false,
      shipsFrom: '',
      soldBy: '',

      // Images
      mainImage: '',
      images: [],

      // Product Details
      description: '',
      features: [],
      specifications: {},
      category: '',
      breadcrumb: [],

      // Ratings & Reviews
      rating: '',
      reviewCount: '',
      ratingBreakdown: {},

      // Additional Info
      bestseller: false,
      amazonChoice: false,
      variants: []
    };

    // Title
    const titleElement =
      document.querySelector('#productTitle') ||
      document.querySelector('h1[id*="title"]') ||
      document.querySelector('h1.product-title');
    result.title = titleElement ? titleElement.textContent.trim() : '';

    // ASIN
    const asinElement = document.querySelector('[data-asin]');
    result.asin = asinElement ? asinElement.getAttribute('data-asin') : '';

    // Brand
    const brandElement =
      document.querySelector('#bylineInfo') ||
      document.querySelector('.brand') ||
      document.querySelector('a[id*="brand"]');
    if (brandElement) {
      result.brand = brandElement.textContent.replace(/^(Brand:|Visit the|Store:)/i, '').trim();
    }

    // Price - try multiple selectors
    const priceWhole =
      document.querySelector('.a-price .a-price-whole') ||
      document.querySelector('[class*="price"] .a-price-whole');
    const priceFraction =
      document.querySelector('.a-price .a-price-fraction') ||
      document.querySelector('[class*="price"] .a-price-fraction');

    if (priceWhole) {
      let priceText = priceWhole.textContent.trim();
      if (priceFraction) {
        priceText += priceFraction.textContent.trim();
      }
      result.price = priceText;
    } else {
      // Fallback to any element with price class
      const priceElement =
        document.querySelector('[class*="price-to-pay"]') ||
        document.querySelector('[id*="priceblock"]') ||
        document.querySelector('.a-price');
      result.price = priceElement ? priceElement.textContent.trim() : '';
    }

    // List Price (original price)
    const listPriceElement =
      document.querySelector('.a-price[data-a-strike="true"]') ||
      document.querySelector('[class*="list-price"]');
    result.listPrice = listPriceElement ? listPriceElement.textContent.trim() : '';

    // Currency
    const currencyElement = document.querySelector('.a-price-symbol');
    result.currency = currencyElement ? currencyElement.textContent.trim() : '';

    // Availability
    const availElement =
      document.querySelector('#availability') || document.querySelector('[id*="availability"]');
    if (availElement) {
      result.availability = availElement.textContent.trim();
      result.inStock =
        result.availability.toLowerCase().includes('in stock') ||
        result.availability.toLowerCase().includes('available');
    }

    // Ships from and Sold by
    const merchantElement = document.querySelector('#merchant-info');
    if (merchantElement) {
      const merchantText = merchantElement.textContent;
      const shipsMatch = merchantText.match(/Ships from\s+([^.]+)/i);
      const soldMatch = merchantText.match(/Sold by\s+([^.]+)/i);
      result.shipsFrom = shipsMatch ? shipsMatch[1].trim() : '';
      result.soldBy = soldMatch ? soldMatch[1].trim() : '';
    }

    // Main Image
    const mainImgElement =
      document.querySelector('#landingImage') ||
      document.querySelector('[data-old-hires]') ||
      document.querySelector('#imgBlkFront') ||
      document.querySelector('[id*="main-image"]');
    result.mainImage = mainImgElement
      ? mainImgElement.getAttribute('data-old-hires') ||
        mainImgElement.getAttribute('src') ||
        mainImgElement.src ||
        ''
      : '';

    // Additional Images
    const imageElements = document.querySelectorAll('[id*="altImages"] img, .imageThumbnail img');
    imageElements.forEach((img) => {
      const imgUrl = img.getAttribute('src') || img.src || '';
      if (imgUrl && !result.images.includes(imgUrl)) {
        result.images.push(imgUrl);
      }
    });

    // Product Description
    const descElement =
      document.querySelector('#productDescription p') ||
      document.querySelector('[id*="description"]');
    result.description = descElement ? descElement.textContent.trim() : '';

    // Product Features (bullet points)
    const featureElements = document.querySelectorAll('#feature-bullets li, [id*="feature"] li');
    featureElements.forEach((li) => {
      const text = li.textContent.trim();
      if (text && text.length > 5) {
        result.features.push(text);
      }
    });

    // Specifications (product details table)
    const specElements = document.querySelectorAll(
      '#productDetails_detailBullets_sections1 tr, #detailBullets_feature_div li, [id*="detail"] tr'
    );
    specElements.forEach((element) => {
      if (element.tagName === 'TR') {
        const th = element.querySelector('th');
        const td = element.querySelector('td');
        if (th && td) {
          const key = th.textContent.trim().replace(/\s+/g, ' ');
          const value = td.textContent.trim().replace(/\s+/g, ' ');
          if (key && value) {
            result.specifications[key] = value;
          }
        }
      } else if (element.tagName === 'LI') {
        const text = element.textContent;
        const colonIndex = text.indexOf(':');
        if (colonIndex > 0) {
          const key = text.substring(0, colonIndex).trim();
          const value = text.substring(colonIndex + 1).trim();
          if (key && value) {
            result.specifications[key] = value;
          }
        }
      }
    });

    // Category/Breadcrumb
    const breadcrumbElements = document.querySelectorAll('#wayfinding-breadcrumbs_feature_div a');
    breadcrumbElements.forEach((a) => {
      const text = a.textContent.trim();
      if (text) {
        result.breadcrumb.push(text);
      }
    });
    result.category =
      result.breadcrumb.length > 0 ? result.breadcrumb[result.breadcrumb.length - 1] : '';

    // Rating
    const ratingElement =
      document.querySelector('[data-hook="rating-out-of-text"]') ||
      document.querySelector('.a-icon-star span') ||
      document.querySelector('[class*="reviewStars"]');
    result.rating = ratingElement ? ratingElement.textContent.trim() : '';

    // Review Count
    const reviewCountElement =
      document.querySelector('#acrCustomerReviewText') ||
      document.querySelector('[data-hook="total-review-count"]');
    result.reviewCount = reviewCountElement ? reviewCountElement.textContent.trim() : '';

    // Rating Breakdown
    const ratingBreakdownElements = document.querySelectorAll('[class*="histogram"] tr');
    ratingBreakdownElements.forEach((row) => {
      const starText = row.querySelector('td:first-child')?.textContent.trim();
      const percentage = row.querySelector('td:last-child')?.textContent.trim();
      if (starText && percentage) {
        result.ratingBreakdown[starText] = percentage;
      }
    });

    // Badges
    const bestsellerElement = document.querySelector('[id*="bestseller"], [class*="bestseller"]');
    result.bestseller = !!bestsellerElement;

    const amazonChoiceElement = document.querySelector(
      '[id*="amazons-choice"], [class*="amazon-choice"]'
    );
    result.amazonChoice = !!amazonChoiceElement;

    return result;
  });
  /* eslint-enable no-undef */

  logger.debug('Product data extracted successfully');
  return data;
}

/**
 * Scrape multiple product detail pages
 * @param {Array<string>} urls - Array of product URLs
 * @param {Object} options - Scraping options
 * @returns {Promise<Array<Object>>} - Array of product details
 */
async function scrapeMultipleProducts(urls, options = {}) {
  const { logger = createConsoleLogger(config.logging.level) } = options;

  const products = [];
  for (const url of urls) {
    try {
      const product = await scrapeProductDetail(url, options);
      products.push(product);
      logger.info(`Scraped ${products.length}/${urls.length} products`);

      // Small delay between products
      if (products.length < urls.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (error) {
      logger.error(`Failed to scrape ${url}: ${error.message}`);
      products.push({
        url,
        error: error.message,
        scrapedAt: new Date().toISOString()
      });
    }
  }

  return products;
}

// CLI execution
if (require.main === module) {
  const url = process.argv[2];

  if (!url) {
    console.error('Usage: node amazon_product_detail.js <amazon_product_url>');
    console.error('Example: node amazon_product_detail.js "https://www.amazon.com/dp/B0123456789"');
    process.exit(1);
  }

  scrapeProductDetail(url)
    .then((product) => {
      console.log('\n✓ Product scraped successfully!\n');
      console.log(JSON.stringify(product, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Scraping failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  scrapeProductDetail,
  scrapeMultipleProducts
};
