#!/usr/bin/env node
/**
 * Amazon Scraper CLI
 *
 * All-in-one command-line tool for scraping products, reviews, and tracking prices
 */

require('dotenv').config();

const { scrapeProductDetail } = require('../scrapers/amazon_product_detail');
const { scrapeReviews } = require('../scrapers/amazon_reviews');
const { saveProduct, saveReview, getProduct, closeDatabase } = require('../utils/database');
const { trackPrice, analyzePriceChanges, compareWithAverage } = require('../utils/price-tracker');
const { exportData } = require('../utils/exporter');
const { createConsoleLogger } = require('../utils/logger');

const logger = createConsoleLogger('info');

/**
 * Command handlers
 */
const commands = {
  /**
   * Scrape product detail and save to database
   */
  async product(url, options = {}) {
    console.log(`\n🔍 Scraping product: ${url}\n`);

    const productData = await scrapeProductDetail(url, { logger });

    // Save to database
    const productId = await saveProduct(productData);
    console.log(`\n✓ Product saved to database (ID: ${productId})`);

    // Export if requested
    if (options.export) {
      const filename = options.output || `product_${productData.asin}`;
      await exportData([productData], filename, options.format || 'json', { pretty: true }, logger);
    }

    // Display summary
    console.log('\n📊 Product Summary:');
    console.log(`  Title: ${productData.title}`);
    console.log(`  ASIN: ${productData.asin}`);
    console.log(`  Price: ${productData.price}`);
    console.log(`  Rating: ${productData.rating}`);
    console.log(`  In Stock: ${productData.inStock ? 'Yes' : 'No'}`);

    return productData;
  },

  /**
   * Scrape reviews and save to database
   */
  async reviews(asinOrUrl, options = {}) {
    console.log(`\n📝 Scraping reviews: ${asinOrUrl}\n`);

    const maxPages = options.pages || 5;
    const reviewData = await scrapeReviews(asinOrUrl, { maxPages, logger });

    // Save reviews to database
    let savedCount = 0;
    for (const review of reviewData.reviews) {
      try {
        await saveReview(reviewData.asin, review);
        savedCount++;
      } catch (error) {
        if (!error.message.includes('already exists')) {
          logger.warn(`Failed to save review: ${error.message}`);
        }
      }
    }

    console.log(`\n✓ Saved ${savedCount} reviews to database`);

    // Export if requested
    if (options.export) {
      const filename = options.output || `reviews_${reviewData.asin}`;
      await exportData(
        reviewData.reviews,
        filename,
        options.format || 'json',
        { pretty: true },
        logger
      );
    }

    // Display summary
    console.log('\n📊 Reviews Summary:');
    console.log(`  ASIN: ${reviewData.asin}`);
    console.log(`  Overall Rating: ${reviewData.summary.overallRating}`);
    console.log(`  Total Reviews Scraped: ${reviewData.totalReviews}`);
    console.log('\n  Rating Distribution:');
    Object.entries(reviewData.summary.ratingDistribution).forEach(([stars, data]) => {
      console.log(`    ${stars}: ${data.percentage} (${data.count} reviews)`);
    });

    return reviewData;
  },

  /**
   * Track price for a product
   */
  async track(asinOrUrl, _options = {}) {
    console.log(`\n💰 Tracking price: ${asinOrUrl}\n`);

    const result = await trackPrice(asinOrUrl, { logger, saveToDb: true });

    console.log(`\n✓ Price tracked for ${result.asin}`);
    console.log('\n📊 Price Information:');
    console.log(`  Product: ${result.title}`);
    console.log(`  Current Price: ${result.currentPrice}`);
    console.log(`  List Price: ${result.listPrice || 'N/A'}`);
    console.log(`  In Stock: ${result.inStock ? 'Yes' : 'No'}`);

    if (result.statistics) {
      console.log('\n📈 Historical Statistics:');
      console.log(`  Minimum: ${result.statistics.min_price}`);
      console.log(`  Maximum: ${result.statistics.max_price}`);
      console.log(`  Average: ${result.statistics.avg_price}`);
      console.log(`  Data Points: ${result.statistics.data_points}`);
    }

    return result;
  },

  /**
   * Analyze price changes
   */
  async analyze(asin, options = {}) {
    console.log(`\n📈 Analyzing price changes: ${asin}\n`);

    const days = options.days || 30;
    const analysis = await analyzePriceChanges(asin, { days });

    if (analysis.dataPoints === 0) {
      console.log(`\n⚠️  ${analysis.message}`);
      return analysis;
    }

    console.log(`\n✓ Analysis complete (${analysis.period})`);
    console.log('\n📊 Statistics:');
    console.log(`  Current Price: ${analysis.currentPrice}`);
    console.log(`  Minimum: ${analysis.statistics.min}`);
    console.log(`  Maximum: ${analysis.statistics.max}`);
    console.log(`  Average: ${analysis.statistics.average}`);
    console.log(`  Change: ${analysis.statistics.change} (${analysis.statistics.changePercent}%)`);

    if (analysis.priceDrops.length > 0) {
      console.log('\n💸 Recent Price Drops:');
      analysis.priceDrops.slice(0, 3).forEach((drop, i) => {
        console.log(
          `  ${i + 1}. ${new Date(drop.date).toLocaleDateString()}: ${drop.oldPrice} → ${drop.newPrice} (-${drop.dropPercent}%)`
        );
      });
    }

    console.log('\n💡 Recommendation:');
    console.log(
      `  Score: ${'⭐'.repeat(analysis.recommendation.score)} (${analysis.recommendation.score}/5)`
    );
    console.log(`  ${analysis.recommendation.message}`);

    return analysis;
  },

  /**
   * Get product info from database
   */
  async info(asin, options = {}) {
    console.log(`\n🔍 Getting product info: ${asin}\n`);

    const product = await getProduct(asin);

    if (!product) {
      console.log(`\n⚠️  Product ${asin} not found in database`);
      console.log('   Run: scraper product <url> to scrape and save it first');
      return null;
    }

    console.log('✓ Product found\n');
    console.log('📊 Product Details:');
    console.log(`  Title: ${product.title}`);
    console.log(`  Brand: ${product.brand}`);
    console.log(`  ASIN: ${product.asin}`);
    console.log(`  Current Price: ${product.current_price}`);
    console.log(`  Rating: ${product.rating} (${product.review_count} reviews)`);
    console.log(`  Category: ${product.category}`);
    console.log(`  In Stock: ${product.in_stock ? 'Yes' : 'No'}`);
    console.log(`  Last Updated: ${product.last_updated}`);

    if (options.full) {
      if (product.features.length > 0) {
        console.log('\n📝 Features:');
        product.features.forEach((f, i) => {
          console.log(`  ${i + 1}. ${f.feature}`);
        });
      }

      if (product.specifications.length > 0) {
        console.log('\n⚙️  Specifications:');
        product.specifications.forEach((spec) => {
          console.log(`  ${spec.spec_key}: ${spec.spec_value}`);
        });
      }
    }

    // Show price comparison
    const comparison = await compareWithAverage(asin);
    if (comparison.statistics) {
      console.log('\n💰 Price Tracking:');
      console.log(`  Current: ${product.current_price}`);
      console.log(`  Average: ${comparison.statistics.avgPrice}`);
      console.log(`  Range: ${comparison.statistics.minPrice} - ${comparison.statistics.maxPrice}`);
      console.log(`  Tracking since: ${new Date(comparison.trackingSince).toLocaleDateString()}`);
    }

    return product;
  },

  /**
   * Display help information
   */
  help() {
    console.log(`
🛒 Amazon Scraper CLI - Phase 5A Features

USAGE:
  scraper <command> [arguments] [options]

COMMANDS:
  product <url>           Scrape product detail page
  reviews <asin|url>      Scrape product reviews
  track <asin|url>        Track product price
  analyze <asin>          Analyze price changes
  info <asin>             Get product info from database

OPTIONS:
  --export                Export data to file
  --output <filename>     Output filename (without extension)
  --format <format>       Export format (json, csv, xlsx)
  --pages <number>        Number of review pages to scrape (default: 5)
  --days <number>         Days for price analysis (default: 30)
  --full                  Show full product details

EXAMPLES:
  # Scrape product and save to database
  scraper product "https://www.amazon.com/dp/B0123456789"

  # Scrape product and export to JSON
  scraper product "https://www.amazon.com/dp/B0123456789" --export --format json

  # Scrape 10 pages of reviews
  scraper reviews B0123456789 --pages 10

  # Track price
  scraper track "https://www.amazon.com/dp/B0123456789"

  # Analyze price changes (last 60 days)
  scraper analyze B0123456789 --days 60

  # Get product info
  scraper info B0123456789 --full

DATABASE:
  All data is automatically saved to: ./amazon_scraper.db
  Use SQLite tools to query the database directly

For more information: https://github.com/jslabxyz/js-amz-scraper
`);
  }
};

/**
 * Parse command-line arguments
 */
function parseArgs(args) {
  const command = args[0];
  const argument = args[1];

  const options = {};
  for (let i = 2; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.substring(2);
      const nextArg = args[i + 1];

      if (nextArg && !nextArg.startsWith('--')) {
        options[key] = nextArg;
        i++; // Skip next arg
      } else {
        options[key] = true;
      }
    }
  }

  return { command, argument, options };
}

/**
 * Main CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    commands.help();
    process.exit(0);
  }

  const { command, argument, options } = parseArgs(args);

  if (!commands[command]) {
    console.error(`\n❌ Unknown command: ${command}`);
    console.log('\nRun "scraper help" for usage information\n');
    process.exit(1);
  }

  try {
    if (command === 'help') {
      commands.help();
    } else if (!argument) {
      console.error(`\n❌ Missing argument for command: ${command}`);
      console.log('\nRun "scraper help" for usage information\n');
      process.exit(1);
    } else {
      await commands[command](argument, options);
    }

    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    await closeDatabase();
    process.exit(1);
  }
}

// Run CLI if executed directly
if (require.main === module) {
  main();
}

module.exports = commands;
