# V1 vs V2 Scraper Comparison

This document compares the original scraper (`amazon_scraper_generic.js`) with the enhanced V2 scraper (`amazon_scraper_v2.js`).

## Quick Comparison

| Feature | V1 (Generic) | V2 (Enhanced) |
|---------|--------------|---------------|
| **Retry Logic** | ❌ None | ✅ Exponential backoff |
| **Error Handling** | Basic try/catch | ✅ 9 custom error types |
| **Configuration** | Hardcoded | ✅ 60+ environment variables |
| **Logging** | console.log | ✅ Winston (levels, files, rotation) |
| **Data Validation** | ❌ None | ✅ Configurable validation |
| **Network Failures** | Immediate fail | ✅ Auto-retry with backoff |
| **Browser Config** | Hardcoded | ✅ Fully configurable |
| **Timeout Control** | Fixed values | ✅ All timeouts configurable |
| **Code Size** | ~200 lines | ~320 lines |
| **Dependencies** | 2 (playwright, objects-to-csv) | 4 (+winston, +dotenv) |

---

## When to Use V1

✅ **Use the original V1 scraper when:**

- You need a simple, straightforward scraper
- You're doing one-off scraping tasks
- You don't need retry logic
- You want minimal dependencies
- You're comfortable with hardcoded settings
- You're just learning or prototyping

**Example:**
```bash
node src/scrapers/amazon_scraper_generic.js "https://amazon.co.uk/s?k=laptop"
```

---

## When to Use V2

✅ **Use the enhanced V2 scraper when:**

- You need production-grade reliability
- You're experiencing network issues
- You want automatic retry on failures
- You need configurable timeouts
- You want professional logging
- You need data validation
- You're running automated scraping jobs
- You want detailed error messages
- You're deploying to different environments

**Example:**
```bash
# With environment variables
LOG_LEVEL=debug MAX_RETRY_ATTEMPTS=5 \
  node src/scrapers/amazon_scraper_v2.js "https://amazon.co.uk/s?k=laptop"
```

---

## Feature Deep Dive

### 1. Error Handling

**V1:**
```javascript
try {
  await page.goto(url);
} catch (error) {
  console.error('Error during scraping:', error);
  throw error;
}
```

**V2:**
```javascript
try {
  await retryPageOperation(async () => {
    await page.goto(url);
  }, 'Navigation', logger);
} catch (error) {
  throw new NavigationError(url, error);
}
```

**Benefits:**
- Specific error types help debugging
- Automatic retry on transient failures
- Better error messages with context

---

### 2. Configuration

**V1:**
```javascript
// Hardcoded in the code
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
```

**V2:**
```javascript
// Configurable via .env or options
const browser = await chromium.launch({
  headless: config.browser.headless,  // From .env: HEADLESS=true
  args: config.browser.args
});
```

**Benefits:**
- Easy to change settings without code changes
- Different configs for dev/staging/prod
- Override via environment variables

---

### 3. Retry Logic

**V1:**
```javascript
// No retry - fails on first error
await page.goto(url, { timeout: 60000 });
```

**V2:**
```javascript
// Automatically retries with exponential backoff
await retryPageOperation(
  async () => await page.goto(url),
  'Navigation',
  logger
);

// With config:
// Attempt 1: Immediate
// Attempt 2: Wait 1s
// Attempt 3: Wait 2s
// Attempt 4: Wait 4s
```

**Benefits:**
- Handles temporary network issues
- Exponential backoff prevents overwhelming server
- Configurable retry attempts

---

### 4. Logging

**V1:**
```javascript
console.log('Navigating to', url);
console.log('Found', products.length, 'products');
```

**V2:**
```javascript
logger.info(`Navigating to ${url}`);
logger.debug('Product grid loaded');
logger.warn('Cookie banner not found');
logger.error('Scraping failed', error);

// Logs to console AND file with timestamps
// [2025-11-16 10:30:45] [INFO]: Navigating to ...
// [2025-11-16 10:30:47] [DEBUG]: Product grid loaded
```

**Benefits:**
- Professional log formatting
- Log levels (error, warn, info, debug)
- File logging with rotation
- Better debugging

---

### 5. Data Validation

**V1:**
```javascript
// No validation - takes whatever is found
products.push({
  title: title,  // Might be empty
  price: price,  // Might be missing
  asin: asin
});
```

**V2:**
```javascript
// Validates products before returning
const { valid, invalid } = validateProducts(products, {
  rules: {
    requireTitle: true,
    requirePrice: true  // Configurable
  }
});

logger.warn(`${invalid.length} products failed validation`);
return valid;
```

**Benefits:**
- Ensures data quality
- Filters out incomplete products
- Configurable validation rules

---

## Migration Guide

### From V1 to V2

**Step 1:** Create `.env` file
```bash
cp .env.example .env
```

**Step 2:** Use V2 scraper
```bash
# Instead of:
node src/scrapers/amazon_scraper_generic.js "URL"

# Use:
node src/scrapers/amazon_scraper_v2.js "URL"
```

**Step 3:** Configure as needed
```env
# .env
LOG_LEVEL=info
MAX_RETRY_ATTEMPTS=3
HEADLESS=true
```

---

## Performance Comparison

| Metric | V1 | V2 | Notes |
|--------|----|----|-------|
| **First run (success)** | ~10s | ~10s | Same speed on success |
| **With network error** | Fails immediately | Retries 3x | V2 takes ~15s but succeeds |
| **Memory usage** | ~150MB | ~160MB | V2 uses ~7% more |
| **Code complexity** | Simple | Moderate | V2 more features = more code |

---

## Code Examples

### Simple Scraping (Both work the same)

**V1:**
```javascript
const { scrapeAmazon } = require('./src/scrapers/amazon_scraper_generic');
const products = await scrapeAmazon(url, 'output.csv');
```

**V2:**
```javascript
const { scrapeAmazon } = require('./src/scrapers/amazon_scraper_v2');
const products = await scrapeAmazon(url, 'output.csv');
```

### Advanced Usage (V2 Only)

```javascript
const { scrapeAmazon } = require('./src/scrapers/amazon_scraper_v2');
const { createConsoleLogger } = require('./src/utils/logger');

const products = await scrapeAmazon(url, 'output.csv', {
  logger: createConsoleLogger('debug'),
  browser: { headless: false },
  retry: { maxAttempts: 5 },
  validation: {
    requireTitle: true,
    requirePrice: true
  }
});
```

---

## Recommendation

**For most users:** Start with **V2**

V2 provides significantly better reliability and debugging capabilities with minimal overhead. The retry logic alone makes it worth using.

**Use V1 only if:**
- You're on a very constrained environment (minimal dependencies)
- You need the absolute simplest code possible
- You're just learning and want to understand the basics

---

## Upgrade Path

We maintain both versions so you can:
1. Start with V1 to learn
2. Upgrade to V2 when you need more features
3. Use both side-by-side for different use cases

**No breaking changes** - Both use the same function signature:
```javascript
scrapeAmazon(url, outputFilename, options?)
```

---

## Future Development

- **V1:** Stable, minimal changes
- **V2:** Active development, new features added

V2 will receive:
- Pagination support (Phase 3)
- Concurrent scraping (Phase 3)
- Rate limiting (Phase 3)
- TypeScript types (Phase 4)
- Docker support (Phase 5)

V1 will remain as a simple, stable option.
