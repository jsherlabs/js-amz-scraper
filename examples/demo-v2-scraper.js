/**
 * Demo: Using the Enhanced V2 Scraper
 *
 * This example demonstrates the new features of amazon_scraper_v2.js
 */

const { scrapeAmazon } = require('../src/scrapers/amazon_scraper_v2');
const { createConsoleLogger } = require('../src/utils/logger');

// Example 1: Basic usage with default configuration
async function example1() {
  console.log('\n=== Example 1: Basic Usage ===\n');

  try {
    const url = 'https://www.amazon.co.uk/s?k=laptop';
    const products = await scrapeAmazon(url, 'example1_output.csv');

    console.log(`✅ Success! Scraped ${products.length} products`);
    console.log('First product:', products[0]);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

// Example 2: Custom configuration
async function example2() {
  console.log('\n=== Example 2: Custom Configuration ===\n');

  try {
    const url = 'https://www.amazon.co.uk/s?k=laptop';

    // Custom configuration
    const customConfig = {
      browser: {
        headless: false, // Show browser for debugging
        viewport: { width: 1280, height: 720 }
      },
      timeouts: {
        navigation: 90000 // Longer timeout (90 seconds)
      },
      retry: {
        maxAttempts: 5 // More retry attempts
      },
      validation: {
        requireTitle: true,
        requirePrice: true // Strict validation
      }
    };

    const products = await scrapeAmazon(url, 'example2_output.csv', customConfig);

    console.log(`✅ Success! Scraped ${products.length} products`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

// Example 3: With custom logger
async function example3() {
  console.log('\n=== Example 3: Custom Logger ===\n');

  try {
    const url = 'https://www.amazon.co.uk/s?k=laptop';

    // Create custom logger with debug level
    const logger = createConsoleLogger('debug');

    const products = await scrapeAmazon(url, 'example3_output.csv', {
      logger,
      validateData: true
    });

    console.log(`✅ Success! Scraped ${products.length} products`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

// Example 4: Error handling demonstration
async function example4() {
  console.log('\n=== Example 4: Error Handling ===\n');

  const urls = [
    'https://www.amazon.co.uk/s?k=laptop',
    'https://www.amazon.co.uk/s?k=invalid-url-that-might-fail',
    'https://www.amazon.co.uk/s?k=tablet'
  ];

  for (const url of urls) {
    try {
      console.log(`\nScraping: ${url}`);
      const products = await scrapeAmazon(url, `output_${Date.now()}.csv`);
      console.log(`✅ Success! Found ${products.length} products`);
    } catch (error) {
      console.error(`❌ Failed: ${error.message}`);
      console.log('Continuing to next URL...');
    }
  }
}

// Example 5: Demonstration of features (without actual scraping)
async function example5Demo() {
  console.log('\n=== Example 5: Feature Demonstration ===\n');

  console.log('📦 V2 Scraper Features:\n');

  console.log('1. ✅ Retry Logic with Exponential Backoff');
  console.log('   - Automatically retries on network failures');
  console.log('   - Configurable attempts (default: 3)');
  console.log('   - Smart backoff: 1s, 2s, 4s, 8s...\n');

  console.log('2. ✅ Custom Error Classes');
  console.log('   - NavigationError - Failed to load page');
  console.log('   - NoProductsFoundError - Zero results');
  console.log('   - ValidationError - Invalid data');
  console.log('   - And 6 more specialized errors\n');

  console.log('3. ✅ Configuration Management');
  console.log('   - 60+ environment variables');
  console.log('   - .env file support');
  console.log('   - Programmatic configuration\n');

  console.log('4. ✅ Professional Logging');
  console.log('   - Winston-based logging');
  console.log('   - Levels: error, warn, info, debug');
  console.log('   - File rotation support\n');

  console.log('5. ✅ Data Validation');
  console.log('   - Validates product fields');
  console.log('   - Configurable requirements');
  console.log('   - Automatic filtering\n');

  console.log('📝 Configuration Example:\n');
  console.log('const config = {');
  console.log('  browser: { headless: false },');
  console.log('  timeouts: { navigation: 90000 },');
  console.log('  retry: { maxAttempts: 5 },');
  console.log('  validation: { requirePrice: true }');
  console.log('};\n');

  console.log('const products = await scrapeAmazon(url, "output.csv", config);\n');
}

// Main execution
async function main() {
  console.log('🚀 Amazon Scraper V2 - Demo\n');
  console.log('This demonstrates the enhanced features of the V2 scraper.');
  console.log('Note: Actual scraping requires a valid Amazon URL and network access.\n');

  // Run the demonstration
  await example5Demo();

  console.log('\n📚 Available Examples:');
  console.log('  example1() - Basic usage with defaults');
  console.log('  example2() - Custom configuration');
  console.log('  example3() - Custom logger');
  console.log('  example4() - Error handling');
  console.log('\n💡 To run an example: node examples/demo-v2-scraper.js');
  console.log('⚙️  Configure via .env file or pass options directly\n');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  example1,
  example2,
  example3,
  example4,
  example5Demo
};
