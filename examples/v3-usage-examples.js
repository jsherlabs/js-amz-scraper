/**
 * V3 Scraper Usage Examples
 *
 * Demonstrates all Phase 3 features with practical examples
 */

const { scrapeAmazon } = require('../src/scrapers/amazon_scraper_v3');

/**
 * Example 1: Basic usage (same as V2)
 */
async function example1_BasicUsage() {
  console.log('\n📝 Example 1: Basic Usage (V3 with V2 compatibility)\n');

  const url = 'https://www.amazon.com/s?k=headphones';

  const result = await scrapeAmazon(url, 'basic_output');

  console.log(`✓ Scraped ${result.totalProducts} products`);
}

/**
 * Example 2: Pagination - Scrape multiple pages
 */
async function example2_Pagination() {
  console.log('\n📝 Example 2: Pagination\n');

  const url = 'https://www.amazon.com/s?k=laptops';

  const result = await scrapeAmazon(url, 'laptops_multi_page', {
    enablePagination: true,
    pagination: {
      maxPages: 5,
      stopOnEmpty: true,
      deduplicateAcrossPages: true,
      waitAfterClick: 3000
    }
  });

  console.log(`✓ Scraped ${result.totalProducts} products from multiple pages`);
}

/**
 * Example 3: Multi-format export
 */
async function example3_MultiFormatExport() {
  console.log('\n📝 Example 3: Multi-Format Export\n');

  const url = 'https://www.amazon.com/s?k=books';

  const result = await scrapeAmazon(url, 'books', {
    exportFormats: ['csv', 'json', 'xlsx'],
    export: {
      jsonPretty: true,
      includeMetadata: true,
      excelSheetName: 'Amazon Books'
    }
  });

  console.log(`✓ Exported to ${result.formats.length} formats: ${result.formats.join(', ')}`);
  console.log('  Files created:');
  console.log('  - books.csv');
  console.log('  - books.json');
  console.log('  - books.xlsx');
}

/**
 * Example 4: Rate limiting for safe scraping
 */
async function example4_RateLimiting() {
  console.log('\n📝 Example 4: Rate Limiting\n');

  const urls = [
    'https://www.amazon.com/s?k=phones',
    'https://www.amazon.com/s?k=tablets',
    'https://www.amazon.com/s?k=smartwatches'
  ];

  const result = await scrapeAmazon(urls, 'electronics', {
    enableRateLimit: true,
    rateLimit: {
      minDelay: 2000,        // 2 seconds minimum
      maxDelay: 5000,        // 5 seconds maximum
      randomize: true,       // Add randomness
      requestsPerMinute: 10  // Max 10 requests/minute
    }
  });

  console.log(`✓ Safely scraped ${urls.length} URLs with rate limiting`);
  console.log(`  Total products: ${result.totalProducts}`);
}

/**
 * Example 5: Resume capability for long jobs
 */
async function example5_ResumeCapability() {
  console.log('\n📝 Example 5: Resume Capability\n');

  const url = 'https://www.amazon.com/s?k=tools';

  const result = await scrapeAmazon(url, 'tools_resumable', {
    enableResume: true,
    enablePagination: true,
    pagination: {
      maxPages: 10
    },
    resume: {
      saveInterval: 5,                    // Save every 5 products
      stateFile: '.tools_scraper_state.json',
      autoRecover: true
    }
  });

  console.log(`✓ Scraped with resume capability`);
  console.log(`  Progress saved automatically every 5 products`);
  console.log(`  Can resume if interrupted`);
}

/**
 * Example 6: All features combined
 */
async function example6_AllFeatures() {
  console.log('\n📝 Example 6: All Phase 3 Features Combined\n');

  const url = 'https://www.amazon.com/s?k=gaming';

  const result = await scrapeAmazon(url, 'gaming_products', {
    // Pagination
    enablePagination: true,
    pagination: {
      maxPages: 10,
      stopOnEmpty: true
    },

    // Rate limiting
    enableRateLimit: true,
    rateLimit: {
      minDelay: 3000,
      maxDelay: 7000,
      randomize: true
    },

    // Resume
    enableResume: true,
    resume: {
      saveInterval: 10
    },

    // Multi-format export
    exportFormats: ['csv', 'json', 'xlsx'],
    export: {
      jsonPretty: true,
      includeMetadata: true
    },

    // Data validation
    validateData: true,
    validation: {
      requireTitle: true,
      requirePrice: false
    }
  });

  console.log(`✓ Complete scraping with all Phase 3 features!`);
  console.log(`  Products: ${result.totalProducts}`);
  console.log(`  Formats: ${result.formats.join(', ')}`);
}

/**
 * Example 7: Concurrent URL processing
 */
async function example7_ConcurrentProcessing() {
  console.log('\n📝 Example 7: Concurrent URL Processing\n');

  const { processUrlsConcurrently } = require('../src/utils/concurrent');

  const urls = [
    'https://www.amazon.com/s?k=cameras',
    'https://www.amazon.com/s?k=lenses',
    'https://www.amazon.com/s?k=tripods'
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

  console.log(`✓ Processed ${results.length} URLs concurrently`);
  results.forEach((r, i) => {
    if (r.success) {
      console.log(`  ${i + 1}. ✓ ${r.url}: ${r.result.totalProducts} products (${r.duration}ms)`);
    } else {
      console.log(`  ${i + 1}. ✗ ${r.url}: ${r.error}`);
    }
  });
}

/**
 * Example 8: Production-ready configuration
 */
async function example8_ProductionConfig() {
  console.log('\n📝 Example 8: Production-Ready Configuration\n');

  const url = 'https://www.amazon.com/s?k=furniture';

  const result = await scrapeAmazon(url, 'furniture_catalog', {
    // Conservative scraping to avoid detection
    enablePagination: true,
    pagination: {
      maxPages: 20,
      waitAfterClick: 5000
    },

    // Strong rate limiting
    enableRateLimit: true,
    rateLimit: {
      minDelay: 5000,
      maxDelay: 15000,
      randomize: true,
      requestsPerMinute: 5
    },

    // Fault tolerance
    enableResume: true,
    resume: {
      saveInterval: 5
    },

    // Multiple output formats
    exportFormats: ['csv', 'json'],
    export: {
      jsonPretty: true,
      includeMetadata: true
    },

    // Strict validation
    validateData: true,
    validation: {
      requireTitle: true,
      requirePrice: true,
      requireAsin: true
    },

    // Error handling
    retry: {
      maxAttempts: 5,
      initialDelay: 2000
    }
  });

  console.log(`✓ Production scraping complete!`);
  console.log(`  Total products: ${result.totalProducts}`);
  console.log(`  Quality: High (strict validation)`);
  console.log(`  Reliability: High (retry + resume)`);
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('🚀 V3 Scraper Usage Examples');
  console.log('════════════════════════════════════════════════════════════');

  console.log('\nNote: These examples require internet access and real Amazon URLs.');
  console.log('In this environment, they will demonstrate the configuration patterns.\n');

  // Comment out actual execution in demo mode
  // Uncomment to run with real URLs
  /*
  try {
    await example1_BasicUsage();
    await example2_Pagination();
    await example3_MultiFormatExport();
    await example4_RateLimiting();
    await example5_ResumeCapability();
    await example6_AllFeatures();
    await example7_ConcurrentProcessing();
    await example8_ProductionConfig();

    console.log('\n════════════════════════════════════════════════════════════');
    console.log('✅ All examples completed successfully!');
    console.log('════════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
  */

  console.log('Example configurations shown above. To run with real URLs,');
  console.log('uncomment the execution code in this file.\n');
}

// Export examples for individual use
module.exports = {
  example1_BasicUsage,
  example2_Pagination,
  example3_MultiFormatExport,
  example4_RateLimiting,
  example5_ResumeCapability,
  example6_AllFeatures,
  example7_ConcurrentProcessing,
  example8_ProductionConfig
};

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}
