const { chromium } = require('playwright');
const ObjectsToCsv = require('objects-to-csv');

async function scrapeAmazon(url, outputFilename = 'amazon_output.csv') {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-GB',
    timezoneId: 'Europe/London'
  });
  
  const page = await context.newPage();
  
  try {
    console.log(`Navigating to ${url}...`);
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    console.log('Waiting for page to load...');
    
    try {
      await page.click('#sp-cc-accept', { timeout: 3000 });
      console.log('Cookie banner dismissed');
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log('No cookie banner found or already dismissed');
    }
    
    try {
      await page.waitForSelector('[class*="ProductGridItem"], [data-component-type="s-search-result"]', { timeout: 10000 });
      console.log('Product grid loaded');
    } catch (e) {
      console.log('Product grid not found, continuing anyway');
    }
    
    await page.waitForTimeout(3000);
    
    console.log('Extracting product data...');
    
    const scrapedData = await page.evaluate(() => {
      const products = [];
      
      const productElements = document.querySelectorAll('[class*="ProductGridItem"], [data-component-type="s-search-result"], [data-asin]:not([data-asin=""])');
      
      productElements.forEach((element) => {
        let titleElement = element.querySelector('h1, h2, h3, h4, h5, h6');
        if (!titleElement) {
          titleElement = element.querySelector('[class*="title"], [class*="Title"]');
        }
        if (!titleElement) {
          const link = element.querySelector('a[href*="/dp/"]');
          if (link) titleElement = link;
        }
        
        let priceElement = element.querySelector('[class*="price"], [class*="Price"]');
        if (!priceElement) {
          priceElement = element.querySelector('.a-price, .a-price-whole, .a-offscreen');
        }
        
        const imageElement = element.querySelector('img');
        const linkElement = element.querySelector('a[href*="/dp/"], a[href*="/gp/"]');
        
        const title = titleElement ? titleElement.textContent.trim() : '';
        const price = priceElement ? priceElement.textContent.trim() : '';
        const imageUrl = imageElement ? (imageElement.src || imageElement.dataset.src || imageElement.getAttribute('data-src') || '') : '';
        const productLink = linkElement ? linkElement.href : '';
        
        let asin = element.getAttribute('data-asin') || '';
        if (!asin && linkElement && linkElement.href) {
          const asinMatch = linkElement.href.match(/\/dp\/([A-Z0-9]{10})/);
          if (asinMatch) {
            asin = asinMatch[1];
          }
        }
        
        if (title || price || imageUrl || productLink) {
          products.push({
            title: title,
            price: price,
            imageUrl: imageUrl,
            productLink: productLink,
            asin: asin
          });
        }
      });
      
      if (products.length === 0) {
        const allElements = document.querySelectorAll('div, article, section');
        let foundCount = 0;
        
        allElements.forEach((element) => {
          if (foundCount >= 50) return;
          
          const hasImage = element.querySelector('img');
          const hasLink = element.querySelector('a[href*="/dp/"], a[href*="/gp/"]');
          const hasPrice = element.querySelector('[class*="price"], [class*="Price"]') || 
                          element.textContent.match(/£\d+|\$\d+/);
          
          if (hasImage && (hasLink || hasPrice)) {
            const titleElement = element.querySelector('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="name"]');
            const priceElement = element.querySelector('[class*="price"], [class*="Price"]');
            const imageElement = element.querySelector('img');
            const linkElement = element.querySelector('a[href*="/dp/"], a[href*="/gp/"]');
            
            const title = titleElement ? titleElement.textContent.trim() : '';
            const price = priceElement ? priceElement.textContent.trim() : '';
            const imageUrl = imageElement ? (imageElement.src || imageElement.dataset.src || '') : '';
            const productLink = linkElement ? linkElement.href : '';
            
            if (title && title.length > 3) {
              products.push({
                title: title,
                price: price,
                imageUrl: imageUrl,
                productLink: productLink,
                asin: ''
              });
              foundCount++;
            }
          }
        });
      }
      
      return products;
    });
    
    console.log(`Found ${scrapedData.length} products`);
    
    const uniqueProducts = [];
    const seen = new Set();
    
    for (const product of scrapedData) {
      const key = `${product.title}-${product.asin}-${product.productLink}`;
      if (!seen.has(key) && (product.title || product.asin)) {
        seen.add(key);
        uniqueProducts.push(product);
      }
    }
    
    console.log(`After removing duplicates: ${uniqueProducts.length} products`);
    
    if (uniqueProducts.length > 0) {
      const csv = new ObjectsToCsv(uniqueProducts);
      await csv.toDisk(`./${outputFilename}`);
      console.log(`Data saved to ${outputFilename}`);
    } else {
      console.log('No products found to save');
    }
    
    console.log('\nSample data:');
    console.log(JSON.stringify(uniqueProducts.slice(0, 3), null, 2));
    
    return uniqueProducts;
    
  } catch (error) {
    console.error('Error during scraping:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  const url = process.argv[2];
  const outputFile = process.argv[3] || 'amazon_output.csv';
  
  if (!url) {
    console.error('Usage: node amazon_scraper_generic.js <amazon_url> [output_filename.csv]');
    console.error('Example: node amazon_scraper_generic.js "https://www.amazon.co.uk/stores/page/..." my_output.csv');
    process.exit(1);
  }
  
  scrapeAmazon(url, outputFile)
    .then(() => {
      console.log('Scraping completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Scraping failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeAmazon };
