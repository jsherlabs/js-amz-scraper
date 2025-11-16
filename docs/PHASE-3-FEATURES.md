# Phase 3 Features: Scalability & Advanced Capabilities

## Overview

Phase 3 adds enterprise-grade features to the Amazon scraper, focusing on scalability, flexibility, and production readiness. The V3 scraper includes all features from V1 and V2, plus:

- **Pagination Support** - Scrape multiple pages automatically
- **Multi-Format Export** - Export to CSV, JSON, and Excel
- **Rate Limiting** - Control request frequency to avoid detection
- **Resume Capability** - Continue interrupted scrapes
- **Concurrent Processing** - Process multiple URLs in parallel

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Pagination](#pagination)
3. [Multi-Format Export](#multi-format-export)
4. [Rate Limiting](#rate-limiting)
5. [Resume Capability](#resume-capability)
6. [Concurrent Processing](#concurrent-processing)
7. [Configuration Guide](#configuration-guide)
8. [Examples](#examples)

---

## Quick Start

### Using V3 Scraper

```bash
# Basic usage (same as V2)
node src/scrapers/amazon_scraper_v3.js "AMAZON_URL" "output"

# With pagination enabled
ENABLE_PAGINATION=true MAX_PAGES=10 \
  node src/scrapers/amazon_scraper_v3.js "AMAZON_URL" "output"

# Export to multiple formats
EXPORT_FORMATS=csv,json,xlsx \
  node src/scrapers/amazon_scraper_v3.js "AMAZON_URL" "output"

# With all Phase 3 features
ENABLE_PAGINATION=true \
ENABLE_RATE_LIMIT=true \
ENABLE_RESUME=true \
EXPORT_FORMATS=csv,json,xlsx \
MAX_PAGES=20 \
  node src/scrapers/amazon_scraper_v3.js "AMAZON_URL" "output"
```

### Using npm Scripts

```bash
# V3 scraper
npm run scrape:v3 "AMAZON_URL" "output"
```

---

## Pagination

Automatically scrape multiple pages of results.

### How It Works

The pagination system:
1. Scrapes the current page
2. Looks for "Next" button using multiple selectors
3. Clicks the button and waits for navigation
4. Repeats until max pages reached or no more pages

### Configuration

```env
# Enable pagination
ENABLE_PAGINATION=true

# Maximum pages to scrape
MAX_PAGES=5

# Wait time after clicking next (milliseconds)
PAGINATION_WAIT=3000

# Stop if a page has no products
PAGINATION_STOP_ON_EMPTY=true

# Remove duplicates across pages
PAGINATION_DEDUPE=true
```

### Usage Example

```javascript
const { scrapeAmazon } = require('./src/scrapers/amazon_scraper_v3');

const products = await scrapeAmazon(url, 'output', {
  enablePagination: true,
  pagination: {
    maxPages: 10,
    stopOnEmpty: true,
    deduplicateAcrossPages: true
  }
});

console.log(`Scraped ${products.totalProducts} products from ${products.urls} page(s)`);
```

### Benefits

- **Higher Data Volume**: Collect hundreds or thousands of products
- **Automatic**: No manual clicking required
- **Deduplication**: Removes duplicates across pages
- **Smart Stopping**: Stops when no more results found

---

## Multi-Format Export

Export scraped data to CSV, JSON, or Excel formats.

### Supported Formats

- **CSV** - Universal spreadsheet format
- **JSON** - For APIs and data processing
- **Excel (.xlsx)** - Native Excel format with formatting

### Configuration

```env
# Comma-separated list of formats
EXPORT_FORMATS=csv,json,xlsx

# Pretty-print JSON (easier to read)
JSON_PRETTY=true

# Include metadata in JSON export
INCLUDE_METADATA=true

# Excel sheet name
EXCEL_SHEET_NAME=Products
```

### Usage Example

```javascript
const products = await scrapeAmazon(url, 'amazon_products', {
  exportFormats: ['csv', 'json', 'xlsx']
});

// Creates:
// - amazon_products.csv
// - amazon_products.json
// - amazon_products.xlsx
```

### JSON with Metadata

When `INCLUDE_METADATA=true`:

```json
{
  "metadata": {
    "exportDate": "2024-01-15T10:30:00.000Z",
    "totalProducts": 50,
    "format": "json"
  },
  "products": [
    {
      "title": "Product 1",
      "price": "$29.99",
      "asin": "B0123456",
      "productLink": "https://amazon.com/...",
      "imageUrl": "https://..."
    }
  ]
}
```

### Excel Features

- **Auto-sized columns** - Columns fit content
- **Header formatting** - Bold headers with gray background
- **Data validation** - All fields properly typed
- **Custom sheet name** - Configurable sheet name

### Installation for Excel Support

Excel export requires the optional `exceljs` package:

```bash
npm install exceljs
```

---

## Rate Limiting

Control request frequency to avoid detection and respect server limits.

### How It Works

The rate limiter:
1. Enforces minimum delay between requests
2. Tracks requests per minute
3. Adds randomness to delays (optional)
4. Prevents bursts of requests

### Configuration

```env
# Enable rate limiting
ENABLE_RATE_LIMIT=true

# Minimum delay between requests (ms)
RATE_LIMIT_MIN_DELAY=1000

# Maximum delay between requests (ms)
RATE_LIMIT_MAX_DELAY=5000

# Add randomness to delays
RATE_LIMIT_RANDOMIZE=true

# Maximum requests per minute
REQUESTS_PER_MINUTE=10
```

### Usage Example

```javascript
const products = await scrapeAmazon(['url1', 'url2', 'url3'], 'output', {
  enableRateLimit: true,
  rateLimit: {
    minDelay: 2000,        // 2 second minimum
    maxDelay: 5000,        // 5 second maximum
    randomize: true,       // Add randomness
    requestsPerMinute: 10  // Max 10 requests/minute
  }
});
```

### Scenarios

**High-Volume Scraping**:
```env
RATE_LIMIT_MIN_DELAY=3000
RATE_LIMIT_MAX_DELAY=7000
REQUESTS_PER_MINUTE=8
```

**Conservative (Avoid Detection)**:
```env
RATE_LIMIT_MIN_DELAY=5000
RATE_LIMIT_MAX_DELAY=15000
REQUESTS_PER_MINUTE=5
RATE_LIMIT_RANDOMIZE=true
```

**Fast Testing**:
```env
RATE_LIMIT_MIN_DELAY=500
RATE_LIMIT_MAX_DELAY=1000
REQUESTS_PER_MINUTE=20
```

---

## Resume Capability

Continue scraping from where you left off if interrupted.

### How It Works

The resume manager:
1. Saves progress periodically to disk
2. Tracks processed URLs and collected products
3. Automatically resumes from last checkpoint
4. Cleans up state file on completion

### Configuration

```env
# Enable resume capability
ENABLE_RESUME=true

# State file location
RESUME_STATE_FILE=.scraper_state.json

# Save state every N products
RESUME_SAVE_INTERVAL=10

# Automatically recover from previous run
AUTO_RECOVER=true
```

### Usage Example

```javascript
// First run (interrupted)
const products = await scrapeAmazon(largeUrlList, 'output', {
  enableResume: true,
  resume: {
    saveInterval: 10,  // Save every 10 products
    autoRecover: true
  }
});
// Scraping interrupted...

// Second run (resumes automatically)
const products = await scrapeAmazon(largeUrlList, 'output', {
  enableResume: true
});
// Continues from last checkpoint!
```

### State File

The state file (`.scraper_state.json`) contains:

```json
{
  "startTime": "2024-01-15T10:00:00.000Z",
  "lastSaveTime": "2024-01-15T10:05:30.000Z",
  "processedUrls": ["url1", "url2", "url3"],
  "failedUrls": [],
  "collectedProducts": [...],
  "currentUrl": "url4",
  "currentPage": 2,
  "totalPages": 10
}
```

### Benefits

- **Fault Tolerance**: Power outages won't lose progress
- **Long-Running Jobs**: Scrape thousands of products safely
- **Manual Interruption**: Pause and resume at will
- **Error Recovery**: Skip failed URLs and continue

---

## Concurrent Processing

Process multiple URLs in parallel for faster scraping.

### How It Works

The worker pool:
1. Creates multiple workers (browser instances)
2. Distributes URLs across workers
3. Processes URLs concurrently
4. Aggregates results from all workers

### Configuration

```env
# Maximum concurrent workers
MAX_WORKERS=3

# Timeout per URL (milliseconds)
WORKER_TIMEOUT=300000

# Continue on errors
CONTINUE_ON_ERROR=true

# Share browser context across workers
SHARE_BROWSER_CONTEXT=false
```

### Usage Example

```javascript
const { processUrlsConcurrently } = require('./src/utils/concurrent');

const urls = [
  'https://www.amazon.com/url1',
  'https://www.amazon.com/url2',
  'https://www.amazon.com/url3'
];

const results = await processUrlsConcurrently(
  urls,
  async (url) => {
    return await scrapeAmazon(url, null, { validateData: true });
  },
  {
    maxWorkers: 3,
    continueOnError: true,
    enableRateLimit: true
  }
);

console.log(`Processed ${results.length} URLs`);
results.forEach(r => {
  if (r.success) {
    console.log(`✓ ${r.url}: ${r.result.totalProducts} products`);
  } else {
    console.log(`✗ ${r.url}: ${r.error}`);
  }
});
```

### Performance Considerations

**Worker Count**:
- 1 worker: Sequential (slowest, safest)
- 3 workers: Balanced (recommended)
- 5+ workers: Fast but resource-intensive

**Memory Usage**:
- Each worker uses ~150-200MB RAM
- 3 workers ≈ 600MB RAM

**Rate Limiting**:
- Always use rate limiting with concurrent processing
- Amazon may block excessive concurrent requests

### Example: Scrape 100 URLs

```javascript
const urls = [...]; // 100 URLs

const results = await processUrlsConcurrently(
  urls,
  async (url) => await scrapeAmazon(url, null),
  {
    maxWorkers: 3,           // 3 parallel workers
    enableRateLimit: true,   // Rate limit each worker
    rateLimit: {
      minDelay: 2000,        // 2s between requests
      requestsPerMinute: 10
    }
  }
);

// Approximate time:
// Sequential: 100 URLs × 10s = 1000s (16 minutes)
// Concurrent (3 workers): ~350s (6 minutes)
```

---

## Configuration Guide

### Environment Variables

Complete list of Phase 3 configuration options:

```env
# ===== PAGINATION =====
ENABLE_PAGINATION=false          # Enable multi-page scraping
MAX_PAGES=5                      # Maximum pages to scrape
PAGINATION_WAIT=3000             # Wait after clicking next (ms)
PAGINATION_STOP_ON_EMPTY=true    # Stop on empty page
PAGINATION_DEDUPE=true           # Deduplicate across pages

# ===== RATE LIMITING =====
ENABLE_RATE_LIMIT=false          # Enable rate limiting
RATE_LIMIT_MIN_DELAY=1000        # Min delay between requests (ms)
RATE_LIMIT_MAX_DELAY=5000        # Max delay between requests (ms)
RATE_LIMIT_RANDOMIZE=true        # Add randomness to delays
REQUESTS_PER_MINUTE=10           # Max requests per minute

# ===== CONCURRENT PROCESSING =====
MAX_WORKERS=3                    # Maximum concurrent workers
WORKER_TIMEOUT=300000            # Timeout per worker (ms)
CONTINUE_ON_ERROR=true           # Continue if a worker fails
SHARE_BROWSER_CONTEXT=false      # Share context across workers

# ===== EXPORT FORMATS =====
EXPORT_FORMATS=csv               # Comma-separated: csv,json,xlsx
JSON_PRETTY=false                # Pretty-print JSON
INCLUDE_METADATA=false           # Include metadata in JSON
EXCEL_SHEET_NAME=Products        # Excel sheet name

# ===== RESUME =====
ENABLE_RESUME=false              # Enable resume capability
RESUME_STATE_FILE=.scraper_state.json  # State file path
RESUME_SAVE_INTERVAL=10          # Save every N products
AUTO_RECOVER=true                # Auto-resume on restart
```

### Programmatic Configuration

Override config in code:

```javascript
const products = await scrapeAmazon(url, 'output', {
  enablePagination: true,
  enableRateLimit: true,
  enableResume: true,
  exportFormats: ['csv', 'json'],

  pagination: {
    maxPages: 20,
    stopOnEmpty: true
  },

  rateLimit: {
    minDelay: 3000,
    maxDelay: 8000,
    requestsPerMinute: 8
  },

  export: {
    jsonPretty: true,
    includeMetadata: true
  },

  resume: {
    saveInterval: 5,
    stateFile: 'my_state.json'
  }
});
```

---

## Examples

### Example 1: Large-Scale Scraping with All Features

```bash
#!/bin/bash

# Scrape 50 pages with all Phase 3 features enabled
ENABLE_PAGINATION=true \
ENABLE_RATE_LIMIT=true \
ENABLE_RESUME=true \
MAX_PAGES=50 \
EXPORT_FORMATS=csv,json,xlsx \
RATE_LIMIT_MIN_DELAY=3000 \
REQUESTS_PER_MINUTE=8 \
JSON_PRETTY=true \
INCLUDE_METADATA=true \
  node src/scrapers/amazon_scraper_v3.js \
  "https://www.amazon.com/s?k=laptops" \
  "laptops_catalog"

# Output files:
# - laptops_catalog.csv
# - laptops_catalog.json
# - laptops_catalog.xlsx
# - .scraper_state.json (cleaned up on success)
```

### Example 2: Conservative Scraping (Avoid Detection)

```javascript
const products = await scrapeAmazon(url, 'output', {
  enablePagination: true,
  enableRateLimit: true,

  pagination: {
    maxPages: 10,
    waitAfterClick: 5000  // Wait 5s after each page
  },

  rateLimit: {
    minDelay: 5000,       // 5s minimum delay
    maxDelay: 15000,      // Up to 15s delay
    randomize: true,      // Random delays
    requestsPerMinute: 5  // Max 5 requests/min
  },

  browser: {
    headless: true,
    locale: 'en-US'
  }
});
```

### Example 3: Fast Data Collection (Testing)

```javascript
const products = await scrapeAmazon(url, 'output', {
  enablePagination: true,

  pagination: {
    maxPages: 3,
    waitAfterClick: 1000  // Fast pagination
  },

  exportFormats: ['json'],  // Single format for speed

  validation: {
    requireTitle: true,
    requirePrice: false     // Relaxed validation
  }
});
```

### Example 4: Resume After Interruption

```javascript
// Long-running job
const urls = Array(100).fill(0).map((_, i) =>
  `https://www.amazon.com/category/page${i}`
);

try {
  const products = await scrapeAmazon(urls, 'large_scrape', {
    enableResume: true,
    enablePagination: true,
    enableRateLimit: true,

    pagination: {
      maxPages: 5
    },

    resume: {
      saveInterval: 5,  // Save every 5 products
      stateFile: '.large_scrape_state.json'
    },

    rateLimit: {
      minDelay: 2000,
      requestsPerMinute: 10
    }
  });

  console.log(`✓ Completed! ${products.totalProducts} products`);
} catch (error) {
  console.log('✗ Interrupted. Run again to resume.');
}
```

---

## Best Practices

### 1. **Always Use Rate Limiting for Production**

```env
ENABLE_RATE_LIMIT=true
RATE_LIMIT_RANDOMIZE=true
```

### 2. **Enable Resume for Large Jobs**

```env
ENABLE_RESUME=true
RESUME_SAVE_INTERVAL=10
```

### 3. **Start with Low Worker Count**

```env
MAX_WORKERS=2  # Start small, increase if stable
```

### 4. **Use Pagination Wisely**

```env
MAX_PAGES=10          # Don't scrape too many pages at once
PAGINATION_STOP_ON_EMPTY=true  # Stop when no more results
```

### 5. **Export to Multiple Formats**

```env
EXPORT_FORMATS=csv,json  # Keep CSV for compatibility, JSON for processing
JSON_PRETTY=true         # Makes debugging easier
```

---

## Migration from V2 to V3

V3 is **fully backward compatible** with V2. All V2 features work the same way.

**New in V3**:
- Pagination support
- Multi-format export
- Rate limiting
- Resume capability
- Concurrent processing

**To upgrade**:
1. Update your code to use `amazon_scraper_v3.js`
2. Add Phase 3 configuration options to `.env`
3. No breaking changes - all V2 code still works!

**Example migration**:

```javascript
// Before (V2)
const products = await scrapeAmazon(url, 'output.csv');

// After (V3) - Works the same!
const products = await scrapeAmazon(url, 'output.csv');

// After (V3) - With new features
const products = await scrapeAmazon(url, 'output', {
  enablePagination: true,
  exportFormats: ['csv', 'json']
});
```

---

## Performance Comparison

| Feature | V1 | V2 | V3 |
|---------|----|----|-----|
| **Single URL** | ✓ | ✓ | ✓ |
| **Error Handling** | Basic | Advanced | Advanced |
| **Retry Logic** | ❌ | ✓ | ✓ |
| **Pagination** | ❌ | ❌ | ✓ |
| **Multi-Format Export** | CSV only | CSV only | CSV, JSON, Excel |
| **Rate Limiting** | ❌ | ❌ | ✓ |
| **Resume** | ❌ | ❌ | ✓ |
| **Concurrent Processing** | ❌ | ❌ | ✓ |
| **Production Ready** | ❌ | ✓ | ✓✓ |

**Speed Comparison** (100 products, 10 pages):
- **V1**: ~5 minutes (no retry, fails on errors)
- **V2**: ~6 minutes (with retry, more reliable)
- **V3**: ~2 minutes (with pagination + concurrency)

---

## Troubleshooting

### Pagination Not Working

**Issue**: Next button not being clicked

**Solutions**:
1. Check `PAGINATION_WAIT` is sufficient (try 5000ms)
2. Verify next button selectors in logs
3. Try with `HEADLESS=false` to see what's happening

### Excel Export Fails

**Issue**: Error when exporting to Excel

**Solutions**:
1. Install exceljs: `npm install exceljs`
2. Check file permissions
3. Ensure sufficient disk space

### Rate Limiting Too Aggressive

**Issue**: Scraping is too slow

**Solutions**:
1. Reduce `RATE_LIMIT_MIN_DELAY`
2. Increase `REQUESTS_PER_MINUTE`
3. Disable `RATE_LIMIT_RANDOMIZE`

### Resume Not Working

**Issue**: Doesn't resume from previous run

**Solutions**:
1. Check state file exists (`.scraper_state.json`)
2. Verify `ENABLE_RESUME=true`
3. Ensure same URL list is provided
4. Check state file permissions

---

## Next Steps

After mastering Phase 3 features, consider:

- **Phase 4**: Modularity & TypeScript
- **Phase 5**: Docker deployment & monitoring
- **Custom scrapers**: Adapt for other e-commerce sites

For questions or issues, see the [main documentation](../README.md) or open a GitHub issue.
