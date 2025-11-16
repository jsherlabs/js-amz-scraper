# Configuration Guide

This guide explains how to configure the Amazon Scraper for your specific needs.

## Table of Contents

- [Environment Variables](#environment-variables)
- [Configuration File](#configuration-file)
- [Browser Settings](#browser-settings)
- [Timeout Configuration](#timeout-configuration)
- [Retry Logic](#retry-logic)
- [Selectors](#selectors)
- [Data Validation](#data-validation)
- [Logging](#logging)

## Environment Variables

The scraper supports configuration via environment variables. Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Then edit `.env` to customize settings.

### Quick Start

Minimal `.env` configuration:

```env
# Essential settings
HEADLESS=true
LOG_LEVEL=info
MAX_RETRY_ATTEMPTS=3
```

## Configuration File

All configuration is centralized in `src/config/scraper.config.js`. You can:

1. Use environment variables (recommended for deployment)
2. Modify the config file directly (for development)
3. Pass custom config as options to `scrapeAmazon()`

## Browser Settings

### Headless Mode

```env
HEADLESS=true  # Run without visible browser (default)
HEADLESS=false # Show browser window (useful for debugging)
```

### Viewport Size

```env
VIEWPORT_WIDTH=1920   # Browser width in pixels
VIEWPORT_HEIGHT=1080  # Browser height in pixels
```

### Locale and Timezone

```env
LOCALE=en-GB              # Browser locale
TIMEZONE=Europe/London    # Browser timezone
```

### Custom User Agent

```env
USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...
```

## Timeout Configuration

All timeouts are in milliseconds:

```env
NAVIGATION_TIMEOUT=60000  # Max time to wait for page navigation (60s)
COOKIE_TIMEOUT=3000       # Max time to wait for cookie banner (3s)
GRID_TIMEOUT=10000        # Max time to wait for product grid (10s)
PAGE_LOAD_TIMEOUT=3000    # Additional wait after page load (3s)
```

### Recommendations

- **Slow connections:** Increase `NAVIGATION_TIMEOUT` to 90000 (90s)
- **Fast scraping:** Decrease `PAGE_LOAD_TIMEOUT` to 1000 (1s)
- **Unreliable sites:** Increase all timeouts by 50%

## Retry Logic

The scraper automatically retries failed operations:

```env
MAX_RETRY_ATTEMPTS=3       # Number of retry attempts (default: 3)
RETRY_INITIAL_DELAY=1000   # Initial delay between retries in ms (1s)
RETRY_MAX_DELAY=30000      # Maximum delay between retries in ms (30s)
RETRY_BACKOFF=2            # Exponential backoff multiplier (2x)
```

### How Retry Works

With default settings:
- **Attempt 1:** Immediate
- **Attempt 2:** Wait 1s (1000ms × 2^0)
- **Attempt 3:** Wait 2s (1000ms × 2^1)
- **Attempt 4:** Wait 4s (1000ms × 2^2)

### Which Operations are Retried?

- ✅ Browser launch
- ✅ Page navigation
- ✅ Network requests
- ❌ Data extraction (not retryable)
- ❌ Validation errors (not retryable)

## Selectors

Advanced: Customize CSS selectors if Amazon changes their HTML structure.

```env
# Cookie banner
COOKIE_SELECTOR=#sp-cc-accept

# Product grid
GRID_SELECTOR=[class*="ProductGridItem"], [data-component-type="s-search-result"]

# Product elements
PRODUCT_SELECTOR=[class*="ProductGridItem"], [data-component-type="s-search-result"], [data-asin]:not([data-asin=""])
```

### When to Update Selectors

- Products not being found
- Zero results on pages that have products
- Amazon changed their page structure

## Data Validation

Control which fields are required for a product to be considered valid:

```env
REQUIRE_TITLE=true   # Reject products without titles
REQUIRE_PRICE=false  # Allow products without prices
REQUIRE_IMAGE=false  # Allow products without images
REQUIRE_LINK=false   # Allow products without links
REQUIRE_ASIN=false   # Allow products without ASINs
```

### Validation Modes

**Strict Mode** (high quality data):
```env
REQUIRE_TITLE=true
REQUIRE_PRICE=true
REQUIRE_IMAGE=true
REQUIRE_LINK=true
REQUIRE_ASIN=true
```

**Lenient Mode** (maximum results):
```env
REQUIRE_TITLE=true
REQUIRE_PRICE=false
REQUIRE_IMAGE=false
REQUIRE_LINK=false
REQUIRE_ASIN=false
```

## Logging

### Log Levels

```env
LOG_LEVEL=error  # Only errors
LOG_LEVEL=warn   # Warnings and errors
LOG_LEVEL=info   # General information (default)
LOG_LEVEL=debug  # Detailed debugging information
```

### Log Outputs

```env
LOG_CONSOLE=true   # Log to console (default)
LOG_FILE=false     # Log to file (disabled by default)
```

### File Logging

Enable file logging for production:

```env
LOG_FILE=true
LOG_DIR=logs                # Directory for log files
LOG_FILENAME=scraper.log    # Main log file
LOG_MAX_SIZE=10m            # Max file size before rotation
LOG_MAX_FILES=5             # Keep last 5 log files
```

## Scraping Behavior

```env
MAX_FALLBACK_PRODUCTS=50  # Max products to extract using fallback method
MIN_TITLE_LENGTH=3        # Minimum title length to be valid
WAIT_NETWORK_IDLE=true    # Wait for network to be idle before extraction
```

## Output Settings

```env
DEFAULT_OUTPUT_FILE=amazon_output.csv  # Default CSV filename
SAMPLE_OUTPUT_SIZE=3                   # Number of products to show in console
```

## Programmatic Configuration

You can also configure the scraper programmatically:

```javascript
const { scrapeAmazon } = require('./src/scrapers/amazon_scraper_v2');

const customConfig = {
  browser: {
    headless: false,  // Show browser
    viewport: { width: 1280, height: 720 }
  },
  timeouts: {
    navigation: 90000  // Longer timeout
  },
  retry: {
    maxAttempts: 5  // More retries
  }
};

const products = await scrapeAmazon(url, 'output.csv', customConfig);
```

## Troubleshooting

### Problem: "Navigation timeout" errors

**Solution:** Increase navigation timeout

```env
NAVIGATION_TIMEOUT=120000  # Increase to 2 minutes
```

### Problem: No products found

**Solutions:**
1. Enable debug logging to see what's happening:
   ```env
   LOG_LEVEL=debug
   ```

2. Disable headless mode to see the browser:
   ```env
   HEADLESS=false
   ```

3. Increase page load timeout:
   ```env
   PAGE_LOAD_TIMEOUT=5000
   ```

### Problem: Too many retry attempts

**Solution:** Reduce retry attempts for faster failure:

```env
MAX_RETRY_ATTEMPTS=1
```

### Problem: Products failing validation

**Solution:** Check which fields are missing:

1. Enable debug logging:
   ```env
   LOG_LEVEL=debug
   ```

2. Relax validation rules:
   ```env
   REQUIRE_TITLE=true
   REQUIRE_PRICE=false
   REQUIRE_ASIN=false
   ```

## Best Practices

1. **Development:** Use `LOG_LEVEL=debug` and `HEADLESS=false`
2. **Production:** Use `LOG_LEVEL=info`, `LOG_FILE=true`, `HEADLESS=true`
3. **Slow networks:** Increase all timeouts by 50-100%
4. **Rate limiting:** Increase `RETRY_INITIAL_DELAY` to 2000-5000ms
5. **Data quality:** Enable strict validation with all `REQUIRE_*=true`

## Example Configurations

### Development

```.env
HEADLESS=false
LOG_LEVEL=debug
LOG_CONSOLE=true
LOG_FILE=false
MAX_RETRY_ATTEMPTS=1
```

### Production

```.env
HEADLESS=true
LOG_LEVEL=info
LOG_CONSOLE=false
LOG_FILE=true
MAX_RETRY_ATTEMPTS=3
REQUIRE_TITLE=true
REQUIRE_PRICE=true
```

### High-Volume Scraping

```.env
HEADLESS=true
LOG_LEVEL=warn
MAX_RETRY_ATTEMPTS=5
RETRY_INITIAL_DELAY=2000
NAVIGATION_TIMEOUT=120000
```

## Environment-Specific Configuration

Use different `.env` files for different environments:

```bash
# Development
cp .env.example .env.development

# Production
cp .env.example .env.production

# Load specific environment
NODE_ENV=production node src/scrapers/amazon_scraper_v2.js
```

## Security Notes

⚠️ **Never commit `.env` files to version control!**

The `.env` file is already in `.gitignore`. Keep it that way.

## Support

For more help:
- Check [README.md](../README.md) for general usage
- See [examples](../examples/) for code samples
- Open an issue on GitHub
