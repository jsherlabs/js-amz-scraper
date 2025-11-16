"""Unit tests for Amazon scraper Python implementation"""
import pytest
from unittest.mock import Mock, MagicMock, patch, mock_open
import sys
import os

# Add src directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'scrapers'))

from amazon_scraper_generic import scrape_amazon


@pytest.fixture
def mock_playwright():
    """Fixture to mock Playwright components"""
    mock_page = MagicMock()
    mock_context = MagicMock()
    mock_browser = MagicMock()
    mock_playwright_obj = MagicMock()

    # Setup page mock
    mock_page.goto = MagicMock()
    mock_page.click = MagicMock()
    mock_page.wait_for_timeout = MagicMock()
    mock_page.wait_for_selector = MagicMock()
    mock_page.evaluate = MagicMock(return_value=[
        {
            'title': 'Product 1',
            'price': '£10.00',
            'imageUrl': 'https://example.com/img1.jpg',
            'productLink': 'https://amazon.co.uk/dp/ASIN123456',
            'asin': 'ASIN123456'
        },
        {
            'title': 'Product 2',
            'price': '£20.00',
            'imageUrl': 'https://example.com/img2.jpg',
            'productLink': 'https://amazon.co.uk/dp/ASIN654321',
            'asin': 'ASIN654321'
        }
    ])

    # Setup context mock
    mock_context.new_page = MagicMock(return_value=mock_page)

    # Setup browser mock
    mock_browser.new_context = MagicMock(return_value=mock_context)
    mock_browser.close = MagicMock()

    # Setup playwright mock
    mock_playwright_obj.chromium.launch = MagicMock(return_value=mock_browser)

    return {
        'playwright': mock_playwright_obj,
        'browser': mock_browser,
        'context': mock_context,
        'page': mock_page
    }


class TestAmazonScraper:
    """Test suite for Amazon scraper"""

    @patch('amazon_scraper_generic.sync_playwright')
    @patch('builtins.open', new_callable=mock_open)
    def test_scrape_amazon_success(self, mock_file, mock_sync_playwright, mock_playwright):
        """Test successful scraping of Amazon products"""
        mock_sync_playwright.return_value.__enter__.return_value = mock_playwright['playwright']

        url = 'https://www.amazon.co.uk/stores/page/test'
        result = scrape_amazon(url)

        assert len(result) == 2
        assert result[0]['title'] == 'Product 1'
        assert result[1]['title'] == 'Product 2'

    @patch('amazon_scraper_generic.sync_playwright')
    @patch('builtins.open', new_callable=mock_open)
    def test_browser_launch_configuration(self, mock_file, mock_sync_playwright, mock_playwright):
        """Test browser is launched with correct configuration"""
        mock_sync_playwright.return_value.__enter__.return_value = mock_playwright['playwright']

        url = 'https://www.amazon.com/stores/page/test'
        scrape_amazon(url)

        mock_playwright['playwright'].chromium.launch.assert_called_once_with(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox']
        )

    @patch('amazon_scraper_generic.sync_playwright')
    @patch('builtins.open', new_callable=mock_open)
    def test_browser_context_settings(self, mock_file, mock_sync_playwright, mock_playwright):
        """Test browser context is created with correct settings"""
        mock_sync_playwright.return_value.__enter__.return_value = mock_playwright['playwright']

        url = 'https://www.amazon.com/stores/page/test'
        scrape_amazon(url)

        mock_playwright['browser'].new_context.assert_called_once()
        call_args = mock_playwright['browser'].new_context.call_args[1]

        assert 'Chrome' in call_args['user_agent']
        assert call_args['viewport'] == {'width': 1920, 'height': 1080}
        assert call_args['locale'] == 'en-GB'
        assert call_args['timezone_id'] == 'Europe/London'

    @patch('amazon_scraper_generic.sync_playwright')
    @patch('builtins.open', new_callable=mock_open)
    def test_page_navigation(self, mock_file, mock_sync_playwright, mock_playwright):
        """Test page navigates to correct URL"""
        mock_sync_playwright.return_value.__enter__.return_value = mock_playwright['playwright']

        url = 'https://www.amazon.co.uk/stores/page/test'
        scrape_amazon(url)

        mock_playwright['page'].goto.assert_called_once_with(
            url,
            wait_until='networkidle',
            timeout=60000
        )

    @patch('amazon_scraper_generic.sync_playwright')
    @patch('builtins.open', new_callable=mock_open)
    def test_cookie_banner_handling(self, mock_file, mock_sync_playwright, mock_playwright):
        """Test cookie banner is dismissed"""
        mock_sync_playwright.return_value.__enter__.return_value = mock_playwright['playwright']

        url = 'https://www.amazon.com/stores/page/test'
        scrape_amazon(url)

        mock_playwright['page'].click.assert_called_with('#sp-cc-accept', timeout=3000)

    @patch('amazon_scraper_generic.sync_playwright')
    @patch('builtins.open', new_callable=mock_open)
    def test_cookie_banner_not_found(self, mock_file, mock_sync_playwright, mock_playwright):
        """Test graceful handling when cookie banner not found"""
        mock_sync_playwright.return_value.__enter__.return_value = mock_playwright['playwright']
        mock_playwright['page'].click.side_effect = Exception('Element not found')

        url = 'https://www.amazon.com/stores/page/test'
        result = scrape_amazon(url)

        assert result is not None
        assert len(result) > 0

    @patch('amazon_scraper_generic.sync_playwright')
    @patch('builtins.open', new_callable=mock_open)
    def test_product_grid_wait(self, mock_file, mock_sync_playwright, mock_playwright):
        """Test waiting for product grid to load"""
        mock_sync_playwright.return_value.__enter__.return_value = mock_playwright['playwright']

        url = 'https://www.amazon.com/stores/page/test'
        scrape_amazon(url)

        mock_playwright['page'].wait_for_selector.assert_called_with(
            '[class*="ProductGridItem"], [data-component-type="s-search-result"]',
            timeout=10000
        )

    @patch('amazon_scraper_generic.sync_playwright')
    @patch('builtins.open', new_callable=mock_open)
    def test_csv_output_default_filename(self, mock_file, mock_sync_playwright, mock_playwright):
        """Test CSV is written with default filename"""
        mock_sync_playwright.return_value.__enter__.return_value = mock_playwright['playwright']

        url = 'https://www.amazon.com/stores/page/test'
        scrape_amazon(url)

        mock_file.assert_called_with('amazon_output.csv', 'w', newline='', encoding='utf-8')

    @patch('amazon_scraper_generic.sync_playwright')
    @patch('builtins.open', new_callable=mock_open)
    def test_csv_output_custom_filename(self, mock_file, mock_sync_playwright, mock_playwright):
        """Test CSV is written with custom filename"""
        mock_sync_playwright.return_value.__enter__.return_value = mock_playwright['playwright']

        url = 'https://www.amazon.com/stores/page/test'
        custom_filename = 'custom_output.csv'
        scrape_amazon(url, custom_filename)

        mock_file.assert_called_with(custom_filename, 'w', newline='', encoding='utf-8')

    @patch('amazon_scraper_generic.sync_playwright')
    @patch('builtins.open', new_callable=mock_open)
    def test_browser_closes_on_error(self, mock_file, mock_sync_playwright, mock_playwright):
        """Test browser closes even when error occurs"""
        mock_sync_playwright.return_value.__enter__.return_value = mock_playwright['playwright']
        mock_playwright['page'].goto.side_effect = Exception('Navigation failed')

        url = 'https://www.amazon.com/stores/page/test'

        with pytest.raises(Exception, match='Navigation failed'):
            scrape_amazon(url)

        mock_playwright['browser'].close.assert_called_once()

    @patch('amazon_scraper_generic.sync_playwright')
    @patch('builtins.open', new_callable=mock_open)
    def test_duplicate_removal(self, mock_file, mock_sync_playwright, mock_playwright):
        """Test duplicate products are removed"""
        mock_sync_playwright.return_value.__enter__.return_value = mock_playwright['playwright']

        # Mock with duplicate products
        mock_playwright['page'].evaluate.return_value = [
            {
                'title': 'Product 1',
                'price': '£10.00',
                'imageUrl': 'https://example.com/img1.jpg',
                'productLink': 'https://amazon.co.uk/dp/ASIN123456',
                'asin': 'ASIN123456'
            },
            {
                'title': 'Product 1',
                'price': '£10.00',
                'imageUrl': 'https://example.com/img1.jpg',
                'productLink': 'https://amazon.co.uk/dp/ASIN123456',
                'asin': 'ASIN123456'
            },
            {
                'title': 'Product 2',
                'price': '£20.00',
                'imageUrl': 'https://example.com/img2.jpg',
                'productLink': 'https://amazon.co.uk/dp/ASIN654321',
                'asin': 'ASIN654321'
            }
        ]

        url = 'https://www.amazon.com/stores/page/test'
        result = scrape_amazon(url)

        assert len(result) == 2

    @patch('amazon_scraper_generic.sync_playwright')
    @patch('builtins.open', new_callable=mock_open)
    def test_no_products_found(self, mock_file, mock_sync_playwright, mock_playwright):
        """Test handling when no products are found"""
        mock_sync_playwright.return_value.__enter__.return_value = mock_playwright['playwright']
        mock_playwright['page'].evaluate.return_value = []

        url = 'https://www.amazon.com/stores/page/test'
        result = scrape_amazon(url)

        assert len(result) == 0
        # CSV file should not be opened when no products found
        mock_file.assert_not_called()

    @patch('amazon_scraper_generic.sync_playwright')
    @patch('builtins.open', new_callable=mock_open)
    def test_returned_product_structure(self, mock_file, mock_sync_playwright, mock_playwright):
        """Test returned products have correct structure"""
        mock_sync_playwright.return_value.__enter__.return_value = mock_playwright['playwright']

        url = 'https://www.amazon.com/stores/page/test'
        result = scrape_amazon(url)

        assert 'title' in result[0]
        assert 'price' in result[0]
        assert 'imageUrl' in result[0]
        assert 'productLink' in result[0]
        assert 'asin' in result[0]

    @patch('amazon_scraper_generic.sync_playwright')
    @patch('builtins.open', new_callable=mock_open)
    def test_page_evaluation_error(self, mock_file, mock_sync_playwright, mock_playwright):
        """Test handling of page evaluation errors"""
        mock_sync_playwright.return_value.__enter__.return_value = mock_playwright['playwright']
        mock_playwright['page'].evaluate.side_effect = Exception('Evaluation failed')

        url = 'https://www.amazon.com/stores/page/test'

        with pytest.raises(Exception, match='Evaluation failed'):
            scrape_amazon(url)

        mock_playwright['browser'].close.assert_called_once()
