#!/usr/bin/env python3
from playwright.sync_api import sync_playwright
import csv
import json
import sys

def scrape_amazon(url, output_filename='amazon_output.csv'):
    """
    Scrape Amazon product listings from any Amazon URL
    
    Args:
        url: Amazon URL to scrape
        output_filename: Output CSV filename (default: amazon_output.csv)
    
    Returns:
        List of product dictionaries
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox']
        )
        
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1920, 'height': 1080},
            locale='en-GB',
            timezone_id='Europe/London'
        )
        
        page = context.new_page()
        
        try:
            print(f'Navigating to {url}...')
            page.goto(url, wait_until='networkidle', timeout=60000)
            
            print('Waiting for page to load...')
            
            try:
                page.click('#sp-cc-accept', timeout=3000)
                print('Cookie banner dismissed')
                page.wait_for_timeout(2000)
            except Exception as e:
                print('No cookie banner found or already dismissed')
            
            try:
                page.wait_for_selector('[class*="ProductGridItem"], [data-component-type="s-search-result"]', timeout=10000)
                print('Product grid loaded')
            except Exception as e:
                print('Product grid not found, continuing anyway')
            
            page.wait_for_timeout(3000)
            
            print('Extracting product data...')
            
            scraped_data = page.evaluate('''() => {
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
                        const asinMatch = linkElement.href.match(/\\/dp\\/([A-Z0-9]{10})/);
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
                                        element.textContent.match(/£\\d+|\\$\\d+/);
                        
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
            }''')
            
            print(f'Found {len(scraped_data)} products')
            
            unique_products = []
            seen = set()
            
            for product in scraped_data:
                key = f"{product['title']}-{product['asin']}-{product['productLink']}"
                if key not in seen and (product['title'] or product['asin']):
                    seen.add(key)
                    unique_products.append(product)
            
            print(f'After removing duplicates: {len(unique_products)} products')
            
            if len(unique_products) > 0:
                with open(output_filename, 'w', newline='', encoding='utf-8') as csvfile:
                    fieldnames = ['title', 'price', 'imageUrl', 'productLink', 'asin']
                    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                    
                    writer.writeheader()
                    for product in unique_products:
                        writer.writerow(product)
                
                print(f'Data saved to {output_filename}')
            else:
                print('No products found to save')
            
            print('\nSample data:')
            print(json.dumps(unique_products[:3], indent=2))
            
            return unique_products
            
        except Exception as error:
            print(f'Error during scraping: {error}')
            raise
        finally:
            browser.close()

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python amazon_scraper_generic.py <amazon_url> [output_filename.csv]')
        print('Example: python amazon_scraper_generic.py "https://www.amazon.co.uk/stores/page/..." my_output.csv')
        sys.exit(1)
    
    url = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'amazon_output.csv'
    
    try:
        scrape_amazon(url, output_file)
        print('Scraping completed successfully!')
    except Exception as e:
        print(f'Scraping failed: {e}')
        sys.exit(1)
