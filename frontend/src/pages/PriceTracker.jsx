import { useState, useEffect } from 'react';
import { TrendingDown, TrendingUp, DollarSign, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../components/Card';
import StatsCard from '../components/StatsCard';
import api from '../services/api';
import socket from '../services/socket';

export default function PriceTracker() {
  const [trackedProducts, setTrackedProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [priceStats, setPriceStats] = useState(null);
  const [priceAnalysis, setPriceAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    loadTrackedProducts();
    setupWebSocket();

    return () => {
      socket.off('track:completed');
    };
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      loadPriceData(selectedProduct.asin);
    }
  }, [selectedProduct]);

  const loadTrackedProducts = async () => {
    try {
      setLoading(true);
      // Load all products and filter tracked ones
      // In a real app, there would be a dedicated tracked products endpoint
      const response = await api.getProducts({ limit: 100 });

      if (response.success && response.data) {
        const products = response.data.products || [];
        setTrackedProducts(products);

        // Auto-select first product if available
        if (products.length > 0 && !selectedProduct) {
          setSelectedProduct(products[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load tracked products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPriceData = async (asin) => {
    try {
      setChartLoading(true);

      // Load price history
      const historyResponse = await api.getPriceHistory(asin, { limit: 100, days: 30 });
      if (historyResponse.success) {
        // Transform data for Recharts
        const chartData = historyResponse.data.history.map(entry => ({
          date: new Date(entry.recorded_at).toLocaleDateString(),
          price: parseFloat(entry.price),
          timestamp: entry.recorded_at
        }));
        setPriceHistory(chartData);
      }

      // Load price stats
      const statsResponse = await api.getPriceStats(asin);
      if (statsResponse.success) {
        setPriceStats(statsResponse.data.stats);
      }

      // Load price analysis
      const analysisResponse = await api.getPriceAnalysis(asin, 30);
      if (analysisResponse.success) {
        setPriceAnalysis(analysisResponse.data.analysis);
      }
    } catch (error) {
      console.error('Failed to load price data:', error);
    } finally {
      setChartLoading(false);
    }
  };

  const setupWebSocket = () => {
    socket.connect();

    socket.on('track:completed', (data) => {
      if (data.asin === selectedProduct?.asin) {
        loadPriceData(data.asin);
      }
    });
  };

  const formatPrice = (price) => {
    return price ? `$${parseFloat(price).toFixed(2)}` : 'N/A';
  };

  const getPriceChange = () => {
    if (!priceStats) return null;

    const current = parseFloat(priceStats.current_price);
    const avg = parseFloat(priceStats.avg_price);

    if (!current || !avg) return null;

    const change = ((current - avg) / avg) * 100;
    return {
      value: Math.abs(change).toFixed(1),
      positive: change < 0 // Lower than average is good for buyers
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (trackedProducts.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Price Tracker</h1>
        <Card>
          <div className="text-center py-12">
            <TrendingDown className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Tracked Products</h3>
            <p className="text-gray-600 mb-6">
              Start tracking product prices to see charts and analysis here.
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
        <h1 className="text-2xl font-bold text-gray-900">Price Tracker</h1>
        <p className="mt-1 text-sm text-gray-600">
          Tracking {trackedProducts.length} products
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product List Sidebar */}
        <div className="lg:col-span-1">
          <Card title="Tracked Products">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {trackedProducts.map((product) => (
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
                      <div className="text-xs text-gray-500 font-mono mt-1">
                        {product.asin}
                      </div>
                      <div className="text-sm font-semibold text-primary-600 mt-1">
                        {formatPrice(product.price)}
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
              {/* Price Stats */}
              {priceStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <StatsCard
                    title="Current Price"
                    value={formatPrice(priceStats.current_price)}
                    icon={DollarSign}
                  />
                  <StatsCard
                    title="Average Price"
                    value={formatPrice(priceStats.avg_price)}
                    icon={Activity}
                    trend={getPriceChange()}
                  />
                  <StatsCard
                    title="Lowest Price"
                    value={formatPrice(priceStats.min_price)}
                    icon={TrendingDown}
                  />
                  <StatsCard
                    title="Highest Price"
                    value={formatPrice(priceStats.max_price)}
                    icon={TrendingUp}
                  />
                </div>
              )}

              {/* Price Chart */}
              <Card title={`Price History - ${selectedProduct.title}`}>
                {chartLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  </div>
                ) : priceHistory.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No price history available for this product yet.
                  </div>
                ) : (
                  <div className="mt-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={priceHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `$${value}`}
                        />
                        <Tooltip
                          formatter={(value) => [`$${value}`, 'Price']}
                          labelStyle={{ color: '#000' }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="#2563eb"
                          strokeWidth={2}
                          dot={{ fill: '#2563eb', r: 4 }}
                          activeDot={{ r: 6 }}
                          name="Price"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>

              {/* Price Analysis */}
              {priceAnalysis && (
                <Card title="Price Analysis">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Data Points</div>
                        <div className="text-lg font-semibold">{priceAnalysis.dataPoints}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Price Trend</div>
                        <div className={`text-lg font-semibold flex items-center gap-1 ${
                          priceAnalysis.trend === 'decreasing' ? 'text-green-600' :
                          priceAnalysis.trend === 'increasing' ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {priceAnalysis.trend === 'decreasing' && <TrendingDown className="w-5 h-5" />}
                          {priceAnalysis.trend === 'increasing' && <TrendingUp className="w-5 h-5" />}
                          {priceAnalysis.trend || 'Stable'}
                        </div>
                      </div>
                    </div>

                    {priceAnalysis.recommendation && (
                      <div className={`p-4 rounded-lg ${
                        priceAnalysis.recommendation.includes('Good time to buy')
                          ? 'bg-green-50 border border-green-200'
                          : priceAnalysis.recommendation.includes('Wait')
                          ? 'bg-yellow-50 border border-yellow-200'
                          : 'bg-blue-50 border border-blue-200'
                      }`}>
                        <div className="font-medium text-gray-900 mb-1">Recommendation</div>
                        <div className="text-sm text-gray-700">{priceAnalysis.recommendation}</div>
                      </div>
                    )}

                    {priceAnalysis.message && (
                      <div className="text-sm text-gray-600">
                        {priceAnalysis.message}
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Product Details */}
              <Card title="Product Details">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">ASIN</div>
                    <div className="font-mono">{selectedProduct.asin}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Rating</div>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">★</span>
                      <span>{selectedProduct.rating || 'N/A'}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Reviews</div>
                    <div>{selectedProduct.reviewCount?.toLocaleString() || 0}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Category</div>
                    <div>{selectedProduct.category || 'N/A'}</div>
                  </div>
                </div>
                {selectedProduct.url && (
                  <div className="mt-4">
                    <a
                      href={selectedProduct.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary w-full justify-center"
                    >
                      View on Amazon
                    </a>
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
