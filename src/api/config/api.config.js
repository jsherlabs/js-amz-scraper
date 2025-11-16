/**
 * API Configuration
 */

module.exports = {
  // Server settings
  env: process.env.NODE_ENV || 'development',
  host: process.env.API_HOST || '0.0.0.0',
  port: parseInt(process.env.API_PORT || '3000', 10),
  bodyLimit: process.env.BODY_LIMIT || '10mb',
  logLevel: process.env.LOG_LEVEL || 'info',

  // CORS settings
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },

  // Authentication
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-secret-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: 'amazon-scraper-api',
    audience: 'amazon-scraper-client'
  },

  // Rate limiting
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // 100 requests per window
    message: 'Too many requests from this IP, please try again later.'
  },

  // Job queue (Bull)
  queue: {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0', 10)
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 100,
      removeOnFail: 50
    }
  },

  // Scraper settings
  scraper: {
    maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '3', 10),
    jobTimeout: parseInt(process.env.JOB_TIMEOUT || '300000', 10), // 5 minutes
    defaultMaxPages: parseInt(process.env.DEFAULT_MAX_PAGES || '5', 10)
  },

  // API features
  enableSwagger: process.env.ENABLE_SWAGGER !== 'false',
  enableAuthentication: process.env.ENABLE_AUTH === 'true',
  enableQueue: process.env.ENABLE_QUEUE !== 'false',

  // Database
  database: {
    path: process.env.DB_PATH || './amazon_scraper.db'
  }
};
