# JS AMZ Scraper

[![CI/CD Pipeline](https://github.com/jslabxyz/js-amz-scraper/actions/workflows/ci.yml/badge.svg)](https://github.com/jslabxyz/js-amz-scraper/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Reusable Amazon web scrapers that extract product data from any Amazon URL. Works with stores, search results, category pages, and more. Available in both JavaScript (Node.js) and Python.

## Features

- ✅ **Universal** - Works with Amazon store pages, search results, and category pages
- ✅ **Dual Language** - JavaScript and Python versions with identical functionality
- ✅ **Headless** - Runs in background without visible browser
- ✅ **Smart Extraction** - Automatically finds products using multiple strategies
- ✅ **Duplicate Removal** - Filters out duplicate entries
- ✅ **CSV Export** - Clean, structured data output
- ✅ **Configurable** - Custom output filenames
- ✅ **Multi-Domain** - Works with .com, .co.uk, .de, and other Amazon domains
- ✅ **Reliable** - Optimized for page types that work consistently without bot detection
- ✅ **Well-Tested** - Comprehensive test suite with >70% coverage
- ✅ **Code Quality** - ESLint, Prettier, Black, and Pylint configured
- ✅ **CI/CD** - Automated testing on every push
- ✅ **REST API** - Full-featured REST API with Express.js
- ✅ **Web Dashboard** - Modern React dashboard for data visualization and management
- ✅ **Price Tracking** - SQLite database for storing and tracking product prices over time
- ✅ **Real-time Updates** - WebSocket support for live updates

## Project Structure

```
js-amz-scraper/
├── src/
│   ├── scrapers/          # Main scraper implementations
│   ├── api/               # REST API server (Express.js)
│   ├── utils/             # Utility functions (database, logger, etc.)
│   ├── cli/               # Command-line interface tools
│   └── config/            # Configuration files
├── frontend/              # React dashboard (Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/    # Reusable React components
│   │   ├── pages/         # Page components
│   │   └── services/      # API and WebSocket services
│   └── public/            # Static assets
├── test/
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   ├── api/               # API tests
│   └── fixtures/          # Test fixtures
├── docs/                  # Documentation
├── scripts/               # Utility scripts
├── .github/workflows/     # CI/CD workflows
├── coverage/              # Test coverage reports
└── data/                  # SQLite database storage
```

## Installation

### JavaScript Version

```bash
# Clone the repository
git clone https://github.com/jslabxyz/js-amz-scraper.git
cd js-amz-scraper

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Python Version

```bash
# Install Python dependencies
pip install -r requirements-dev.txt

# Install Playwright browsers
playwright install
```

## Quick Start

### JavaScript

```bash
# Basic usage
node src/scrapers/amazon_scraper_generic.js "https://www.amazon.co.uk/s?k=supplements"

# Custom output filename
node src/scrapers/amazon_scraper_generic.js "https://www.amazon.co.uk/s?k=supplements" my_products.csv

# Using npm script
npm run scrape "https://www.amazon.co.uk/s?k=supplements"
```

### Python

```bash
# Basic usage
python src/scrapers/amazon_scraper_generic.py "https://www.amazon.co.uk/s?k=supplements"

# Custom output filename
python src/scrapers/amazon_scraper_generic.py "https://www.amazon.co.uk/s?k=supplements" my_products.csv
```

## Web Dashboard

A modern, full-featured React dashboard for managing your Amazon scraping operations, tracking prices, and analyzing reviews.

### Features

- 📊 **Dashboard** - Real-time statistics, activity feed, quick actions
- 📦 **Products** - Browse, search, add products, export to CSV
- 💰 **Price Tracker** - Interactive charts, price history, trend analysis
- ⭐ **Reviews** - Review analytics, sentiment analysis, filtering
- 📈 **Analytics** - Market insights, distribution charts, top products
- ⚙️ **Settings** - API configuration, preferences, data export

### Quick Start

```bash
# Install frontend dependencies
npm run install:frontend

# Start backend API (required)
npm run dev

# In another terminal, start frontend dashboard
npm run dev:frontend

# Or run both together
npm run dev:all
```

The dashboard will be available at `http://localhost:5173`

### Production Build

```bash
# Build frontend for production
npm run build:frontend

# The built files will be in frontend/dist/
# You can serve them with any static file server
```

See [frontend/README.md](frontend/README.md) for detailed documentation.

## REST API

The project includes a full-featured REST API for programmatic access to scraping functionality.

### Starting the API Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

API will be available at `http://localhost:3000`

### Key Endpoints

- `POST /api/scrape` - Scrape a product
- `GET /api/products` - List all products
- `GET /api/products/:asin` - Get product details
- `POST /api/track` - Track product price
- `GET /api/prices/:asin/history` - Get price history
- `POST /api/scrape/reviews` - Scrape reviews
- `GET /api/reviews/:asin` - Get reviews

See [docs/API.md](docs/API.md) for complete API documentation.

## Development

### Running Tests

#### JavaScript Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test -- --coverage
```

#### Python Tests

```bash
# Run all Python tests
npm run test:python

# Or use pytest directly
pytest test/ -v --cov=src/scrapers
```

### Code Quality

#### JavaScript Linting & Formatting

```bash
# Check code formatting
npm run format:check

# Fix formatting issues
npm run format

# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Run all quality checks
npm run quality
```

#### Python Linting & Formatting

```bash
# Format Python code with Black
npm run format:python

# Run Pylint
npm run lint:python

# Or use directly
black src/scrapers test/
pylint src/scrapers/*.py
```

### Pre-commit Hooks

This project uses Husky for pre-commit hooks that automatically:
- Check code formatting (Prettier)
- Run ESLint
- Run tests

To install hooks after cloning:

```bash
npm install
```

Hooks will run automatically before each commit. To bypass (not recommended):

```bash
git commit --no-verify
```

## What Works Best

This scraper is optimized for Amazon store pages, which work most reliably:

✅ **Store Pages** - Brand stores and seller storefronts (highly reliable)

⚠️ **Limited Support:** Search results, category pages, and individual product pages may trigger Amazon's bot detection. Results vary depending on your IP address, request frequency, and Amazon's current security settings.

**For Production Use:** If you need reliable access to Amazon product data, we recommend using Amazon's official Product Advertising API.

## Usage Examples

### Scrape an Amazon Store Page

```bash
node src/scrapers/amazon_scraper_generic.js "https://www.amazon.co.uk/stores/page/873F77EE-8A2D-4754-88EC-EF390E82BDD8" store_products.csv
```

### Scrape Search Results

```bash
python src/scrapers/amazon_scraper_generic.py "https://www.amazon.com/s?k=laptop" laptops.csv
```

### Scrape Category/Best Sellers

```bash
node src/scrapers/amazon_scraper_generic.js "https://www.amazon.co.uk/Best-Sellers-Electronics/zgbs/electronics" bestsellers.csv
```

## Output Format

The scrapers generate CSV files with the following columns:

| Column | Description |
|--------|-------------|
| `title` | Product title |
| `price` | Product price with currency symbol |
| `imageUrl` | Product image URL |
| `productLink` | Link to product detail page |
| `asin` | Amazon Standard Identification Number |

### Example Output

```csv
title,price,imageUrl,productLink,asin
"Max Botanics Nattokinase 4000 FU - 120...",£23.99,https://m.media-amazon.com/images/I/71BqB6CZOEL.jpg,https://www.amazon.co.uk/.../dp/B0DCZXJ8LW,B0DCZXJ8LW
"Max Adaptogen 10 | Ashwagandha, Bacopa,...",£17.99,https://m.media-amazon.com/images/I/71+Pn2GfX7L.jpg,https://www.amazon.co.uk/.../dp/B07VKD6HV8,B07VKD6HV8
```

## Programmatic Usage

Both scrapers can be imported and used as modules in your own code.

### JavaScript

```javascript
const { scrapeAmazon } = require('./src/scrapers/amazon_scraper_generic.js');

async function main() {
  const products = await scrapeAmazon(
    'https://www.amazon.co.uk/s?k=supplements',
    'output.csv'
  );

  console.log(`Scraped ${products.length} products`);
  products.forEach(product => {
    console.log(`${product.title} - ${product.price}`);
  });
}

main();
```

### Python

```python
import sys
sys.path.append('src/scrapers')
from amazon_scraper_generic import scrape_amazon

products = scrape_amazon(
    'https://www.amazon.co.uk/s?k=supplements',
    'output.csv'
)

print(f'Scraped {len(products)} products')
for product in products:
    print(f"{product['title']} - {product['price']}")
```

## How It Works

1. **Navigation** - Opens the Amazon URL in a headless browser
2. **Cookie Handling** - Automatically dismisses cookie consent banners
3. **Content Loading** - Waits for product grid to load
4. **Data Extraction** - Uses multiple strategies to find products:
   - Looks for ProductGridItem elements (store pages)
   - Searches for search result components
   - Falls back to generic product detection
5. **Deduplication** - Removes duplicate entries based on title, ASIN, and link
6. **CSV Export** - Saves clean data to CSV file

## Technical Details

### Technologies Used

- **Playwright** - Browser automation framework
- **Chromium** - Headless browser engine
- **objects-to-csv** (JS) / csv module (Python) - CSV generation
- **Jest** - JavaScript testing framework
- **pytest** - Python testing framework
- **ESLint & Prettier** - JavaScript code quality
- **Black & Pylint** - Python code quality

### Browser Configuration

- User Agent: Chrome 120 on Windows
- Viewport: 1920x1080
- Locale: en-GB
- Timezone: Europe/London

### Extraction Strategy

The scrapers use client-side JavaScript evaluation to extract data directly from the DOM. This approach:
- Works with dynamically loaded content
- Handles various Amazon page layouts
- Extracts data efficiently in a single pass

## Testing

This project maintains high test coverage with comprehensive unit and integration tests.

### Test Coverage Goals

- Unit tests: >70% coverage
- All critical paths tested
- Mock Playwright for fast test execution
- Integration tests with sample HTML fixtures

### Viewing Coverage Reports

After running tests, view coverage reports:

```bash
# JavaScript coverage (HTML)
open coverage/index.html

# Python coverage (HTML)
open htmlcov/index.html
```

## CI/CD

This project uses GitHub Actions for continuous integration:

- **JavaScript Tests** - Runs on Node.js 16, 18, 20
- **Python Tests** - Runs on Python 3.9, 3.10, 3.11, 3.12
- **Code Quality** - Linting and formatting checks
- **Coverage Reports** - Uploaded to Codecov

View build status and coverage on the [Actions](https://github.com/jslabxyz/js-amz-scraper/actions) page.

## Troubleshooting

### No Products Found

If the scraper returns 0 products:
- Check that the URL is accessible in a regular browser
- Verify the page contains product listings
- The page structure may be different - check console output for details

### Timeout Errors

If you get timeout errors:
- Check your internet connection
- The page may be loading slowly - increase timeout values in the code
- Amazon may be blocking automated requests

### Rate Limiting

Amazon may block requests if too many are made quickly:
- Add delays between scraping multiple pages
- Use different user agents
- Consider using proxies for large-scale scraping

### Test Failures

If tests fail:
- Ensure all dependencies are installed: `npm install`
- Install Playwright browsers: `npx playwright install`
- Check Node.js version: Requires >=14.0.0
- Check Python version: Requires >=3.8

## Best Practices

- ✅ Respect Amazon's Terms of Service
- ✅ Add delays between requests when scraping multiple pages
- ✅ Use for personal/educational purposes
- ✅ Don't overload Amazon's servers
- ✅ Check robots.txt before large-scale scraping
- ✅ Run tests before committing: `npm test`
- ✅ Follow code style guidelines: `npm run quality`

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Write tests for new functionality
4. Ensure all tests pass: `npm test && npm run test:python`
5. Run code quality checks: `npm run quality`
6. Commit your changes with clear messages
7. Push to your fork and submit a Pull Request

## License

MIT License - See LICENSE file for details

## Support

If you encounter any issues or have questions:
- Open an issue on [GitHub Issues](https://github.com/jslabxyz/js-amz-scraper/issues)
- Check existing issues for solutions
- Provide detailed error messages and reproduction steps

## Disclaimer

This tool is for educational purposes only. Users are responsible for complying with Amazon's Terms of Service and applicable laws. The authors are not responsible for any misuse of this software.

## Roadmap

Future improvements planned:
- [ ] Pagination support for multi-page scraping
- [ ] Concurrent URL processing
- [ ] Retry logic with exponential backoff
- [ ] Configuration file support
- [ ] Additional export formats (JSON, Excel)
- [ ] TypeScript migration
- [ ] Docker containerization
- [ ] Rate limiting controls
- [ ] Proxy support

See [Phase 2-5 improvement plan](docs/IMPROVEMENTS.md) for details.
