# JS AMZ Scraper

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

## Installation

### JavaScript Version

```bash
npm install
npx playwright install
```

### Python Version

```bash
pip install playwright
playwright install
```

## Quick Start

### JavaScript

```bash
# Basic usage
node amazon_scraper_generic.js "https://www.amazon.co.uk/s?k=supplements"

# Custom output filename
node amazon_scraper_generic.js "https://www.amazon.co.uk/s?k=supplements" my_products.csv
```

### Python

```bash
# Basic usage
python amazon_scraper_generic.py "https://www.amazon.co.uk/s?k=supplements"

# Custom output filename
python amazon_scraper_generic.py "https://www.amazon.co.uk/s?k=supplements" my_products.csv
```

## What Works Best

This scraper is optimized for Amazon store pages, which work most reliably:

✅ **Store Pages** - Brand stores and seller storefronts (highly reliable)

⚠️ **Limited Support:** Search results, category pages, and individual product pages may trigger Amazon's bot detection. Results vary depending on your IP address, request frequency, and Amazon's current security settings.

**For Production Use:** If you need reliable access to Amazon product data, we recommend using Amazon's official Product Advertising API.

## Usage Examples

### Scrape an Amazon Store Page

```bash
node amazon_scraper_generic.js "https://www.amazon.co.uk/stores/page/873F77EE-8A2D-4754-88EC-EF390E82BDD8" store_products.csv
```

### Scrape Search Results

```bash
python amazon_scraper_generic.py "https://www.amazon.com/s?k=laptop" laptops.csv
```

### Scrape Category/Best Sellers

```bash
node amazon_scraper_generic.js "https://www.amazon.co.uk/Best-Sellers-Electronics/zgbs/electronics" bestsellers.csv
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
const { scrapeAmazon } = require('./amazon_scraper_generic.js');

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

## Best Practices

- ✅ Respect Amazon's Terms of Service
- ✅ Add delays between requests when scraping multiple pages
- ✅ Use for personal/educational purposes
- ✅ Don't overload Amazon's servers
- ✅ Check robots.txt before large-scale scraping

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.

## Disclaimer

This tool is for educational purposes only. Users are responsible for complying with Amazon's Terms of Service and applicable laws. The authors are not responsible for any misuse of this software.
