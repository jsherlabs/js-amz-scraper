import { useState, useEffect } from 'react';
import { Star, ThumbsUp, ThumbsDown, Filter, Search, CheckCircle } from 'lucide-react';
import Card from '../components/Card';
import api from '../services/api';

export default function Reviews() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [filters, setFilters] = useState({
    rating: 'all',
    verified: 'all',
    helpful: 'all',
    search: ''
  });
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      loadReviews(selectedProduct.asin);
    }
  }, [selectedProduct, filters]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await api.getProducts({ limit: 100 });

      if (response.success && response.data) {
        const productsWithReviews = response.data.products.filter(p => p.reviewCount > 0);
        setProducts(productsWithReviews);

        if (productsWithReviews.length > 0 && !selectedProduct) {
          setSelectedProduct(productsWithReviews[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async (asin) => {
    try {
      setReviewsLoading(true);

      const params = { limit: 100 };

      if (filters.rating !== 'all') {
        params.rating = filters.rating;
      }
      if (filters.verified !== 'all') {
        params.verified = filters.verified === 'true';
      }

      const response = await api.getReviews(asin, params);

      if (response.success && response.data) {
        let reviewsList = response.data.reviews || [];

        // Apply client-side filters
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          reviewsList = reviewsList.filter(r =>
            r.title?.toLowerCase().includes(searchLower) ||
            r.content?.toLowerCase().includes(searchLower) ||
            r.author?.toLowerCase().includes(searchLower)
          );
        }

        if (filters.helpful !== 'all') {
          reviewsList = reviewsList.filter(r => {
            const helpful = r.helpful_count || 0;
            return filters.helpful === 'high' ? helpful > 10 : helpful <= 10;
          });
        }

        setReviews(reviewsList);
        calculateStats(reviewsList);
      }
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const calculateStats = (reviewsList) => {
    const total = reviewsList.length;
    if (total === 0) {
      setStats(null);
      return;
    }

    const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let verifiedCount = 0;
    let totalHelpful = 0;
    let positiveCount = 0;
    let negativeCount = 0;

    reviewsList.forEach(review => {
      const rating = Math.round(review.rating);
      if (rating >= 1 && rating <= 5) {
        ratingCounts[rating]++;
      }
      if (review.verified_purchase) {
        verifiedCount++;
      }
      totalHelpful += review.helpful_count || 0;

      // Simple sentiment based on rating
      if (rating >= 4) positiveCount++;
      else if (rating <= 2) negativeCount++;
    });

    const avgRating = (reviewsList.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1);

    setStats({
      total,
      avgRating,
      ratingCounts,
      verifiedPercent: ((verifiedCount / total) * 100).toFixed(0),
      avgHelpful: (totalHelpful / total).toFixed(1),
      sentimentPositive: ((positiveCount / total) * 100).toFixed(0),
      sentimentNegative: ((negativeCount / total) * 100).toFixed(0),
      sentimentNeutral: (((total - positiveCount - negativeCount) / total) * 100).toFixed(0)
    });
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <Card>
          <div className="text-center py-12">
            <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Reviews Available</h3>
            <p className="text-gray-600 mb-6">
              Scrape product reviews to analyze them here.
            </p>
            <a href="/products" className="btn btn-primary">
              Go to Products
            </a>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="mt-1 text-sm text-gray-600">
          Analyze customer reviews for {products.length} products
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Selector */}
        <div className="lg:col-span-1">
          <Card title="Products">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {products.map((product) => (
                <button
                  key={product.asin}
                  onClick={() => setSelectedProduct(product)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedProduct?.asin === product.asin
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {product.images?.[0] && (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {product.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {renderStars(product.rating)}
                        <span className="text-xs text-gray-500">
                          ({product.reviewCount})
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {selectedProduct && (
            <>
              {/* Review Stats */}
              {stats && (
                <Card title="Review Statistics">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div>
                      <div className="text-sm text-gray-600">Total Reviews</div>
                      <div className="text-2xl font-bold">{stats.total}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Average Rating</div>
                      <div className="text-2xl font-bold flex items-center gap-1">
                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        {stats.avgRating}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Verified</div>
                      <div className="text-2xl font-bold">{stats.verifiedPercent}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Avg Helpful</div>
                      <div className="text-2xl font-bold">{stats.avgHelpful}</div>
                    </div>
                  </div>

                  {/* Rating Distribution */}
                  <div className="space-y-2 mb-6">
                    <div className="text-sm font-medium text-gray-700 mb-2">Rating Distribution</div>
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = stats.ratingCounts[rating] || 0;
                      const percentage = ((count / stats.total) * 100).toFixed(0);
                      return (
                        <div key={rating} className="flex items-center gap-3">
                          <div className="text-sm text-gray-600 w-12">{rating} star</div>
                          <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-400"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <div className="text-sm text-gray-600 w-12 text-right">{percentage}%</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Sentiment Analysis */}
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Sentiment</div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <ThumbsUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
                        <div className="text-sm font-medium text-green-900">{stats.sentimentPositive}%</div>
                        <div className="text-xs text-green-700">Positive</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-900">{stats.sentimentNeutral}%</div>
                        <div className="text-xs text-gray-700">Neutral</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <ThumbsDown className="w-5 h-5 text-red-600 mx-auto mb-1" />
                        <div className="text-sm font-medium text-red-900">{stats.sentimentNegative}%</div>
                        <div className="text-xs text-red-700">Negative</div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Filters */}
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Filters</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Rating</label>
                    <select
                      value={filters.rating}
                      onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
                      className="input text-sm"
                    >
                      <option value="all">All Ratings</option>
                      <option value="5">5 Stars</option>
                      <option value="4">4 Stars</option>
                      <option value="3">3 Stars</option>
                      <option value="2">2 Stars</option>
                      <option value="1">1 Star</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Verified</label>
                    <select
                      value={filters.verified}
                      onChange={(e) => setFilters({ ...filters, verified: e.target.value })}
                      className="input text-sm"
                    >
                      <option value="all">All Reviews</option>
                      <option value="true">Verified Only</option>
                      <option value="false">Non-Verified</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Helpfulness</label>
                    <select
                      value={filters.helpful}
                      onChange={(e) => setFilters({ ...filters, helpful: e.target.value })}
                      className="input text-sm"
                    >
                      <option value="all">All</option>
                      <option value="high">High (&gt;10)</option>
                      <option value="low">Low (≤10)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Search</label>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search reviews..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        className="input text-sm pl-8"
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Reviews List */}
              <Card title={`Reviews (${reviews.length})`}>
                {reviewsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No reviews match the current filters.
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {reviews.map((review, index) => (
                      <div
                        key={index}
                        className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {renderStars(review.rating)}
                              <span className="text-sm font-semibold text-gray-900">
                                {review.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span>{review.author || 'Anonymous'}</span>
                              {review.verified_purchase && (
                                <span className="flex items-center gap-1 text-green-600">
                                  <CheckCircle className="w-3 h-3" />
                                  Verified
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDate(review.date)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{review.content}</p>
                        {review.helpful_count > 0 && (
                          <div className="text-xs text-gray-500">
                            {review.helpful_count} people found this helpful
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
