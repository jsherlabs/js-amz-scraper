/**
 * Amazon Scraper REST API Server
 *
 * Production-ready API for scraping Amazon products, reviews, and price tracking
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const http = require('http');
const { Server } = require('socket.io');

const config = require('./config/api.config');
const { createConsoleLogger } = require('../utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');
const { requestLogger } = require('./middleware/request-logger');

// Import routes
const productRoutes = require('./routes/products');
const reviewRoutes = require('./routes/reviews');
const priceRoutes = require('./routes/prices');
const healthRoutes = require('./routes/health');

const logger = createConsoleLogger(config.logLevel);

/**
 * Create and configure Express application
 */
function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors(config.cors));

  // Body parsing middleware
  app.use(express.json({ limit: config.bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }));

  // Compression
  app.use(compression());

  // Request logging
  app.use(requestLogger(logger));

  // API routes
  app.use('/api/health', healthRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/prices', priceRoutes);

  // API documentation (Swagger)
  if (config.enableSwagger) {
    const swaggerUi = require('swagger-ui-express');
    const swaggerDocument = require('./config/swagger.json');
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  }

  // Error handlers (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler(logger));

  return app;
}

/**
 * Start the API server
 */
async function startServer() {
  try {
    const app = createApp();
    const server = http.createServer(app);

    // Setup WebSocket for real-time updates
    const io = new Server(server, {
      cors: config.cors,
      path: '/api/socket.io'
    });

    // Attach io to app for use in routes
    app.set('io', io);

    // WebSocket connection handling
    io.on('connection', (socket) => {
      logger.info(`WebSocket client connected: ${socket.id}`);

      socket.on('disconnect', () => {
        logger.info(`WebSocket client disconnected: ${socket.id}`);
      });

      socket.on('error', (error) => {
        logger.error(`WebSocket error for ${socket.id}: ${error.message}`);
      });
    });

    // Start server
    server.listen(config.port, config.host, () => {
      logger.info(`🚀 Amazon Scraper API running on http://${config.host}:${config.port}`);
      logger.info(
        `📚 API documentation available at http://${config.host}:${config.port}/api/docs`
      );
      logger.info(`🔌 WebSocket endpoint: ws://${config.host}:${config.port}/api/socket.io`);
      logger.info(`Environment: ${config.env}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, closing server gracefully...');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, closing server gracefully...');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    return server;
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

// Start server if executed directly
if (require.main === module) {
  startServer();
}

module.exports = { createApp, startServer };
