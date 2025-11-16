/**
 * Price Tracking Controller
 */

const {
  getPriceHistory: getPriceHistoryFromDb,
  getPriceStats: getPriceStatsFromDb
} = require('../../utils/database');
const { analyzePriceChanges, getPriceChartData } = require('../../utils/price-tracker');
const { createConsoleLogger } = require('../../utils/logger');
const { ValidationError } = require('../../utils/errors');

const logger = createConsoleLogger('info');

/**
 * Get price history for a product
 * GET /api/prices/:asin/history?limit=100&days=30
 */
async function getPriceHistory(req, res, next) {
  try {
    const { asin } = req.params;
    const { limit = 100, days } = req.query;

    if (!asin) {
      throw new ValidationError('Product ASIN is required');
    }

    logger.info(`Getting price history for: ${asin}`);

    let history = await getPriceHistoryFromDb(asin, parseInt(limit, 10));

    // Filter by days if provided
    if (days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(days, 10));

      history = history.filter((entry) => {
        const recordedDate = new Date(entry.recorded_at);
        return recordedDate >= cutoffDate;
      });
    }

    res.status(200).json({
      success: true,
      data: {
        asin,
        history,
        count: history.length
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get price statistics for a product
 * GET /api/prices/:asin/stats
 */
async function getPriceStats(req, res, next) {
  try {
    const { asin } = req.params;

    if (!asin) {
      throw new ValidationError('Product ASIN is required');
    }

    logger.info(`Getting price stats for: ${asin}`);

    const stats = await getPriceStatsFromDb(asin);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `No price data found for ASIN ${asin}`
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        asin,
        stats
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get price analysis and recommendation
 * GET /api/prices/:asin/analysis?days=30
 */
async function analyzePrices(req, res, next) {
  try {
    const { asin } = req.params;
    const { days = 30 } = req.query;

    if (!asin) {
      throw new ValidationError('Product ASIN is required');
    }

    logger.info(`Analyzing prices for: ${asin}`);

    const analysis = await analyzePriceChanges(asin, {
      days: parseInt(days, 10)
    });

    if (analysis.dataPoints === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: analysis.message
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        asin,
        analysis
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get price chart data
 * GET /api/prices/:asin/chart?days=30&limit=100
 */
async function getChartData(req, res, next) {
  try {
    const { asin } = req.params;
    const { days = 30, limit = 100 } = req.query;

    if (!asin) {
      throw new ValidationError('Product ASIN is required');
    }

    logger.info(`Getting chart data for: ${asin}`);

    const chartData = await getPriceChartData(asin, {
      days: parseInt(days, 10),
      limit: parseInt(limit, 10)
    });

    res.status(200).json({
      success: true,
      data: {
        asin,
        chartData,
        count: chartData.length
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPriceHistory,
  getPriceStats,
  analyzePrices,
  getChartData
};
