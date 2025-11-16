/**
 * Logger Utility
 *
 * Provides structured logging with multiple transports (console, file).
 * Uses winston for production-grade logging capabilities.
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config/scraper.config');

/**
 * Custom log format
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    const log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    return stack ? `${log}\n${stack}` : log;
  })
);

/**
 * Create logger instance
 */
function createLogger(options = {}) {
  const {
    level = config.logging.level,
    enableConsole = config.logging.enableConsole,
    enableFile = config.logging.enableFile,
    logDir = config.logging.logDir,
    filename = config.logging.filename,
    maxSize = config.logging.maxSize,
    maxFiles = config.logging.maxFiles
  } = options;

  const transports = [];

  // Console transport
  if (enableConsole) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), logFormat)
      })
    );
  }

  // File transport
  if (enableFile) {
    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, filename),
        maxsize: maxSize,
        maxFiles: maxFiles,
        format: logFormat
      })
    );

    // Separate error log file
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        maxsize: maxSize,
        maxFiles: maxFiles,
        format: logFormat
      })
    );
  }

  return winston.createLogger({
    level,
    transports,
    exitOnError: false
  });
}

/**
 * Default logger instance
 */
let defaultLogger = null;

/**
 * Get or create default logger
 */
function getLogger() {
  if (!defaultLogger) {
    defaultLogger = createLogger();
  }
  return defaultLogger;
}

/**
 * Simple console-only logger for minimal overhead
 */
function createConsoleLogger(level = 'info') {
  const levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
  };

  const currentLevel = levels[level] || 2;

  return {
    error: (message, ...args) => {
      if (currentLevel >= levels.error) {
        console.error(`[ERROR]: ${message}`, ...args);
      }
    },
    warn: (message, ...args) => {
      if (currentLevel >= levels.warn) {
        console.warn(`[WARN]: ${message}`, ...args);
      }
    },
    info: (message, ...args) => {
      if (currentLevel >= levels.info) {
        console.log(`[INFO]: ${message}`, ...args);
      }
    },
    debug: (message, ...args) => {
      if (currentLevel >= levels.debug) {
        console.log(`[DEBUG]: ${message}`, ...args);
      }
    }
  };
}

module.exports = {
  createLogger,
  getLogger,
  createConsoleLogger
};
