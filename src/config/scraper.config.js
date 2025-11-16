/**
 * Amazon Scraper Configuration
 *
 * This file contains all configurable settings for the scraper.
 * Values can be overridden via environment variables.
 */

module.exports = {
  // Browser Configuration
  browser: {
    headless: process.env.HEADLESS !== 'false', // Can be disabled for debugging
    viewport: {
      width: parseInt(process.env.VIEWPORT_WIDTH || '1920'),
      height: parseInt(process.env.VIEWPORT_HEIGHT || '1080')
    },
    locale: process.env.LOCALE || 'en-GB',
    timezoneId: process.env.TIMEZONE || 'Europe/London',
    userAgent:
      process.env.USER_AGENT ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  },

  // Timeout Configuration (in milliseconds)
  timeouts: {
    navigation: parseInt(process.env.NAVIGATION_TIMEOUT || '60000'), // 60 seconds
    cookieBanner: parseInt(process.env.COOKIE_TIMEOUT || '3000'), // 3 seconds
    productGrid: parseInt(process.env.GRID_TIMEOUT || '10000'), // 10 seconds
    pageLoad: parseInt(process.env.PAGE_LOAD_TIMEOUT || '3000') // 3 seconds
  },

  // Retry Configuration
  retry: {
    maxAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3'),
    initialDelay: parseInt(process.env.RETRY_INITIAL_DELAY || '1000'), // 1 second
    maxDelay: parseInt(process.env.RETRY_MAX_DELAY || '30000'), // 30 seconds
    backoffMultiplier: parseFloat(process.env.RETRY_BACKOFF || '2'), // Exponential backoff
    retryableErrors: ['Navigation timeout', 'net::ERR_', 'TimeoutError', 'ECONNRESET', 'ETIMEDOUT']
  },

  // Selectors Configuration
  selectors: {
    // Cookie banner
    cookieBanner: process.env.COOKIE_SELECTOR || '#sp-cc-accept',

    // Product grid
    productGrid:
      process.env.GRID_SELECTOR ||
      '[class*="ProductGridItem"], [data-component-type="s-search-result"]',

    // Product elements
    productElements:
      process.env.PRODUCT_SELECTOR ||
      '[class*="ProductGridItem"], [data-component-type="s-search-result"], [data-asin]:not([data-asin=""])',

    // Product sub-elements
    title: 'h1, h2, h3, h4, h5, h6',
    titleFallback: '[class*="title"], [class*="Title"]',
    price: '[class*="price"], [class*="Price"]',
    priceFallback: '.a-price, .a-price-whole, .a-offscreen',
    image: 'img',
    link: 'a[href*="/dp/"], a[href*="/gp/"]',

    // Fallback generic search
    genericContainers: 'div, article, section',
    genericTitle: 'h1, h2, h3, h4, h5, h6, [class*="title"], [class*="name"]'
  },

  // Scraping Configuration
  scraping: {
    maxFallbackProducts: parseInt(process.env.MAX_FALLBACK_PRODUCTS || '50'),
    minTitleLength: parseInt(process.env.MIN_TITLE_LENGTH || '3'),
    waitForNetworkIdle: process.env.WAIT_NETWORK_IDLE !== 'false'
  },

  // Data Validation
  validation: {
    requireTitle: process.env.REQUIRE_TITLE !== 'false',
    requirePrice: process.env.REQUIRE_PRICE === 'true',
    requireImage: process.env.REQUIRE_IMAGE === 'true',
    requireLink: process.env.REQUIRE_LINK === 'true',
    requireAsin: process.env.REQUIRE_ASIN === 'true'
  },

  // Output Configuration
  output: {
    defaultFilename: process.env.DEFAULT_OUTPUT_FILE || 'amazon_output.csv',
    sampleSize: parseInt(process.env.SAMPLE_OUTPUT_SIZE || '3'),
    fields: ['title', 'price', 'imageUrl', 'productLink', 'asin']
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info', // error, warn, info, debug
    enableConsole: process.env.LOG_CONSOLE !== 'false',
    enableFile: process.env.LOG_FILE === 'true',
    logDir: process.env.LOG_DIR || 'logs',
    filename: process.env.LOG_FILENAME || 'scraper.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '5')
  },

  // Pagination Configuration
  pagination: {
    enabled: process.env.ENABLE_PAGINATION === 'true',
    maxPages: parseInt(process.env.MAX_PAGES || '5'),
    waitAfterClick: parseInt(process.env.PAGINATION_WAIT || '3000'), // 3 seconds
    nextButtonSelectors: [
      'a.s-pagination-next',
      '.s-pagination-next',
      'li.a-last a',
      'a[aria-label="Next"]',
      'a[title="Next"]',
      'a[aria-label="Go to next page"]'
    ],
    stopOnEmpty: process.env.PAGINATION_STOP_ON_EMPTY !== 'false',
    deduplicateAcrossPages: process.env.PAGINATION_DEDUPE !== 'false'
  },

  // Rate Limiting Configuration
  rateLimit: {
    enabled: process.env.ENABLE_RATE_LIMIT === 'true',
    minDelay: parseInt(process.env.RATE_LIMIT_MIN_DELAY || '1000'), // 1 second between requests
    maxDelay: parseInt(process.env.RATE_LIMIT_MAX_DELAY || '5000'), // 5 seconds max delay
    randomize: process.env.RATE_LIMIT_RANDOMIZE !== 'false', // Add randomness to delays
    requestsPerMinute: parseInt(process.env.REQUESTS_PER_MINUTE || '10')
  },

  // Concurrent Processing Configuration
  concurrency: {
    maxWorkers: parseInt(process.env.MAX_WORKERS || '3'),
    workerTimeout: parseInt(process.env.WORKER_TIMEOUT || '300000'), // 5 minutes per URL
    continueOnError: process.env.CONTINUE_ON_ERROR !== 'false',
    shareContext: process.env.SHARE_BROWSER_CONTEXT === 'true' // Share browser context across workers
  },

  // Export Format Configuration
  export: {
    formats: (process.env.EXPORT_FORMATS || 'csv').split(',').map((f) => f.trim()),
    jsonPretty: process.env.JSON_PRETTY === 'true',
    includeMetadata: process.env.INCLUDE_METADATA === 'true',
    excelSheetName: process.env.EXCEL_SHEET_NAME || 'Products'
  },

  // Resume Configuration
  resume: {
    enabled: process.env.ENABLE_RESUME === 'true',
    stateFile: process.env.RESUME_STATE_FILE || '.scraper_state.json',
    saveInterval: parseInt(process.env.RESUME_SAVE_INTERVAL || '10'), // Save state every N products
    autoRecover: process.env.AUTO_RECOVER !== 'false'
  }
};
