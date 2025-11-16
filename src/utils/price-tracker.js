/**
 * Price Tracking Utility
 *
 * Monitor and analyze product price changes over time
 */

const { getPriceHistory, getPriceStats, saveProduct } = require('./database');
const { scrapeProductDetail } = require('../scrapers/amazon_product_detail');
const { createConsoleLogger } = require('./logger');

const logger = createConsoleLogger('info');

/**
 * Track price for a product (scrape and save)
 * @param {string} asinOrUrl - Product ASIN or URL
 * @param {Object} options - Tracking options
 * @returns {Promise<Object>} - Price tracking result
 */
async function trackPrice(asinOrUrl, options = {}) {
  const { logger: customLogger = logger, saveToDb = true } = options;

  try {
    // Scrape current product data
    customLogger.info(`Tracking price for ${asinOrUrl}...`);
    const productData = await scrapeProductDetail(asinOrUrl, { logger: customLogger });

    if (!saveToDb) {
      return {
        asin: productData.asin,
        currentPrice: productData.price,
        listPrice: productData.listPrice,
        inStock: productData.inStock,
        scrapedAt: productData.scrapedAt
      };
    }

    // Save to database (this automatically records price history)
    await saveProduct(productData);

    // Get price statistics
    const stats = await getPriceStats(productData.asin);

    customLogger.info(`Price tracked for ${productData.asin}: ${productData.price}`);

    return {
      asin: productData.asin,
      title: productData.title,
      currentPrice: productData.price,
      listPrice: productData.listPrice,
      inStock: productData.inStock,
      statistics: stats,
      scrapedAt: productData.scrapedAt
    };
  } catch (error) {
    customLogger.error(`Failed to track price: ${error.message}`);
    throw error;
  }
}

/**
 * Track prices for multiple products
 * @param {Array<string>} asinsOrUrls - Array of ASINs or URLs
 * @param {Object} options - Tracking options
 * @returns {Promise<Array>} - Tracking results
 */
async function trackMultiplePrices(asinsOrUrls, options = {}) {
  const { delay = 3000, logger: customLogger = logger } = options;

  const results = [];

  for (let i = 0; i < asinsOrUrls.length; i++) {
    const asinOrUrl = asinsOrUrls[i];

    try {
      const result = await trackPrice(asinOrUrl, { ...options, logger: customLogger });
      results.push({ success: true, ...result });

      customLogger.info(`Tracked ${i + 1}/${asinsOrUrls.length} products`);

      // Delay between requests
      if (i < asinsOrUrls.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (error) {
      results.push({
        success: false,
        asinOrUrl,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Analyze price changes for a product
 * @param {string} asin - Product ASIN
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} - Price analysis
 */
async function analyzePriceChanges(asin, options = {}) {
  const { days = 30 } = options;

  // Get price history
  const history = await getPriceHistory(asin, 1000);

  if (history.length === 0) {
    return {
      asin,
      message: 'No price history found',
      dataPoints: 0
    };
  }

  // Filter by date range
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const recentHistory = history.filter((entry) => {
    const recordedDate = new Date(entry.recorded_at);
    return recordedDate >= cutoffDate;
  });

  if (recentHistory.length === 0) {
    return {
      asin,
      message: `No price data found in last ${days} days`,
      dataPoints: 0
    };
  }

  // Calculate statistics
  const prices = recentHistory.map((h) => h.price).filter((p) => p !== null);

  const currentPrice = recentHistory[0].price;
  const oldestPrice = recentHistory[recentHistory.length - 1].price;

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

  // Calculate price change
  const priceChange = currentPrice - oldestPrice;
  const priceChangePercent = oldestPrice > 0 ? ((priceChange / oldestPrice) * 100).toFixed(2) : 0;

  // Detect price drops
  const drops = [];
  for (let i = 0; i < recentHistory.length - 1; i++) {
    const current = recentHistory[i];
    const previous = recentHistory[i + 1];

    if (current.price && previous.price && current.price < previous.price) {
      const dropAmount = previous.price - current.price;
      const dropPercent = ((dropAmount / previous.price) * 100).toFixed(2);

      drops.push({
        date: current.recorded_at,
        oldPrice: previous.price,
        newPrice: current.price,
        dropAmount,
        dropPercent
      });
    }
  }

  return {
    asin,
    period: `Last ${days} days`,
    dataPoints: recentHistory.length,
    currentPrice,
    statistics: {
      min: minPrice,
      max: maxPrice,
      average: avgPrice.toFixed(2),
      change: priceChange.toFixed(2),
      changePercent: priceChangePercent
    },
    priceDrops: drops.slice(0, 5), // Top 5 drops
    recommendation: generateRecommendation(currentPrice, avgPrice, minPrice, maxPrice)
  };
}

/**
 * Generate buying recommendation based on price statistics
 * @param {number} currentPrice - Current price
 * @param {number} avgPrice - Average price
 * @param {number} minPrice - Minimum price
 * @param {number} maxPrice - Maximum price
 * @returns {Object} - Recommendation
 */
function generateRecommendation(currentPrice, avgPrice, minPrice, maxPrice) {
  const range = maxPrice - minPrice;
  const position = ((currentPrice - minPrice) / range) * 100;

  let recommendation = '';
  let score = 0;

  if (position <= 20) {
    recommendation = 'Excellent time to buy! Price is near historical low.';
    score = 5;
  } else if (position <= 40) {
    recommendation = 'Good time to buy. Price is below average.';
    score = 4;
  } else if (position <= 60) {
    recommendation = 'Fair price. Close to average.';
    score = 3;
  } else if (position <= 80) {
    recommendation = 'Price is above average. Consider waiting.';
    score = 2;
  } else {
    recommendation = 'Price is near historical high. Wait for better deal.';
    score = 1;
  }

  return {
    score,
    message: recommendation,
    details: {
      currentVsAverage: (((currentPrice - avgPrice) / avgPrice) * 100).toFixed(2) + '%',
      positionInRange: position.toFixed(1) + '%'
    }
  };
}

/**
 * Set up price alert (check if price dropped below threshold)
 * @param {string} asin - Product ASIN
 * @param {number} targetPrice - Target price threshold
 * @returns {Promise<Object>} - Alert result
 */
async function checkPriceAlert(asin, targetPrice) {
  const history = await getPriceHistory(asin, 1);

  if (history.length === 0) {
    return {
      asin,
      alert: false,
      message: 'No price data available'
    };
  }

  const latestPrice = history[0].price;

  if (latestPrice <= targetPrice) {
    return {
      asin,
      alert: true,
      currentPrice: latestPrice,
      targetPrice,
      message: `Price alert! Current price (${latestPrice}) is below target (${targetPrice})`
    };
  }

  return {
    asin,
    alert: false,
    currentPrice: latestPrice,
    targetPrice,
    message: `Price (${latestPrice}) is still above target (${targetPrice})`
  };
}

/**
 * Get price chart data
 * @param {string} asin - Product ASIN
 * @param {Object} options - Chart options
 * @returns {Promise<Array>} - Chart data points
 */
async function getPriceChartData(asin, options = {}) {
  const { days = 30, limit = 100 } = options;

  const history = await getPriceHistory(asin, limit);

  if (history.length === 0) {
    return [];
  }

  // Filter by date range
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const filteredHistory = history.filter((entry) => {
    const recordedDate = new Date(entry.recorded_at);
    return recordedDate >= cutoffDate;
  });

  // Format for charting
  return filteredHistory
    .map((entry) => ({
      date: entry.recorded_at,
      price: entry.price,
      listPrice: entry.list_price,
      inStock: entry.in_stock === 1
    }))
    .reverse(); // Oldest to newest
}

/**
 * Compare current price with historical average
 * @param {string} asin - Product ASIN
 * @returns {Promise<Object>} - Comparison result
 */
async function compareWithAverage(asin) {
  const stats = await getPriceStats(asin);

  if (!stats) {
    return {
      asin,
      message: 'No price data available'
    };
  }

  const difference = stats.max_price - stats.min_price;
  const percentDifference = ((difference / stats.min_price) * 100).toFixed(2);

  return {
    asin,
    statistics: {
      minPrice: stats.min_price,
      maxPrice: stats.max_price,
      avgPrice: parseFloat(stats.avg_price).toFixed(2),
      difference,
      percentDifference
    },
    dataPoints: stats.data_points,
    trackingSince: stats.first_recorded,
    lastUpdate: stats.last_recorded
  };
}

module.exports = {
  trackPrice,
  trackMultiplePrices,
  analyzePriceChanges,
  checkPriceAlert,
  getPriceChartData,
  compareWithAverage,
  generateRecommendation
};
