/**
 * Health Check Routes
 */

const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../utils/database');

/**
 * GET /api/health
 * Simple health check
 */
router.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

/**
 * GET /api/health/detailed
 * Detailed health check (includes database)
 */
router.get('/detailed', async (_req, res, next) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        api: 'ok',
        database: 'unknown'
      }
    };

    // Check database connection
    try {
      const db = await getDatabase();
      await db.get('SELECT 1');
      health.services.database = 'ok';
    } catch (_error) {
      health.services.database = 'error';
      health.status = 'degraded';
    }

    const statusCode = health.status === 'ok' ? 200 : 503;

    res.status(statusCode).json({
      success: health.status === 'ok',
      data: health
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
