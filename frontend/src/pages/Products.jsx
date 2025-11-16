import { useState, useEffect } from 'react';
import { Search, Plus, Download, ExternalLink, TrendingUp, MessageSquare, Loader2 } from 'lucide-react';
import Card from '../components/Card';
import api from '../services/api';
import socket from '../services/socket';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    loadProducts();
    setupWebSocket();

    return () => {
      socket.off('scrape:completed');
    };
  }, [currentPage, searchQuery]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: pageSize
      };

      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await api.getProducts(params);

      if (response.success && response.data) {
        setProducts(response.data.products || []);
        setTotalPages(response.data.pagination?.totalPages || 1);
        setTotalProducts(response.data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    socket.connect();

    socket.on('scrape:completed', (data) => {
      if (data.success) {
        loadProducts(); // Refresh list when new product is scraped
      }
    });
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  const handleTrackProduct = async (asin) => {
    try {
      await api.trackProduct(asin);
      loadProducts(); // Refresh to update tracking status
    } catch (error) {
      console.error('Failed to track product:', error);
      alert('Failed to track product: ' + error.message);
    }
  };

  const handleScrapeReviews = async (asin) => {
    try {
      const confirmed = confirm(`Scrape reviews for ${asin}? This may take a few minutes.`);
      if (!confirmed) return;

      await api.scrapeReviews(asin, 5, true);
      alert('Review scraping started! Check the dashboard for updates.');
    } catch (error) {
      console.error('Failed to scrape reviews:', error);
      alert('Failed to scrape reviews: ' + error.message);
    }
  };

  const handleExport = () => {
    const csv = [
      ['ASIN', 'Title', 'Price', 'Rating', 'Reviews', 'URL'].join(','),
      ...products.map(p => [
        p.asin,
        `"${p.title?.replace(/"/g, '""')}"`,
        p.price || '',
        p.rating || '',
        p.reviewCount || '',
        p.url || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products-${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-600">
            {totalProducts} products in database
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExport} className="btn btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ASIN or title..."
            value={searchQuery}
            onChange={handleSearch}
            className="input pl-10"
          />
        </div>
      </Card>

      {/* Products Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Image</th>
                <th>ASIN</th>
                <th>Title</th>
                <th>Price</th>
                <th>Rating</th>
                <th>Reviews</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    No products found. Add your first product to get started!
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.asin}>
                    <td>
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                          <span className="text-xs text-gray-400">No img</span>
                        </div>
                      )}
                    </td>
                    <td className="font-mono text-sm">{product.asin}</td>
                    <td className="max-w-xs">
                      <div className="truncate" title={product.title}>
                        {product.title || 'N/A'}
                      </div>
                    </td>
                    <td className="font-semibold">
                      {product.price ? `$${product.price}` : 'N/A'}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">★</span>
                        <span>{product.rating || 'N/A'}</span>
                      </div>
                    </td>
                    <td>{product.reviewCount?.toLocaleString() || 0}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTrackProduct(product.asin)}
                          className="p-2 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Track Price"
                        >
                          <TrendingUp className="w-4 h-4 text-primary-600" />
                        </button>
                        <button
                          onClick={() => handleScrapeReviews(product.asin)}
                          className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                          title="Scrape Reviews"
                        >
                          <MessageSquare className="w-4 h-4 text-green-600" />
                        </button>
                        {product.url && (
                          <a
                            href={product.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View on Amazon"
                          >
                            <ExternalLink className="w-4 h-4 text-gray-600" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t pt-4">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Add Product Modal */}
      {showAddModal && (
        <AddProductModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadProducts();
          }}
        />
      )}
    </div>
  );
}

function AddProductModal({ onClose, onSuccess }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('Please enter an Amazon product URL');
      return;
    }

    if (!url.includes('amazon.com')) {
      setError('Please enter a valid Amazon.com URL');
      return;
    }

    try {
      setLoading(true);
      await api.scrapeProduct(url, true);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to scrape product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Add Product</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amazon Product URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.amazon.com/dp/B0XXXXXXXX"
              className="input"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Paste the full Amazon product URL
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex items-center gap-2"
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Scraping...' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
