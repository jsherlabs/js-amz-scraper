import { useState, useEffect } from 'react';
import { TrendingUp, Package, Star, DollarSign, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Card from '../components/Card';
import StatsCard from '../components/StatsCard';
import api from '../services/api';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Analytics() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    avgPrice: 0,
    avgRating: 0,
    totalReviews: 0
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.getProducts({ limit: 1000 });

      if (response.success && response.data) {
        const productsList = response.data.products || [];
        setProducts(productsList);
        calculateStats(productsList);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (productsList) => {
    if (productsList.length === 0) return;

    const totalProducts = productsList.length;
    const productsWithPrice = productsList.filter(p => p.price);
    const productsWithRating = productsList.filter(p => p.rating);

    const totalPrice = productsWithPrice.reduce((sum, p) => sum + parseFloat(p.price || 0), 0);
    const totalRating = productsWithRating.reduce((sum, p) => sum + parseFloat(p.rating || 0), 0);
    const totalReviews = productsList.reduce((sum, p) => sum + (p.reviewCount || 0), 0);

    setStats({
      totalProducts,
      avgPrice: productsWithPrice.length > 0 ? (totalPrice / productsWithPrice.length).toFixed(2) : 0,
      avgRating: productsWithRating.length > 0 ? (totalRating / productsWithRating.length).toFixed(1) : 0,
      totalReviews
    });
  };

  const getPriceDistribution = () => {
    const ranges = [
      { name: '$0-25', min: 0, max: 25, count: 0 },
      { name: '$25-50', min: 25, max: 50, count: 0 },
      { name: '$50-100', min: 50, max: 100, count: 0 },
      { name: '$100-200', min: 100, max: 200, count: 0 },
      { name: '$200+', min: 200, max: Infinity, count: 0 }
    ];

    products.forEach(product => {
      const price = parseFloat(product.price);
      if (!isNaN(price)) {
        const range = ranges.find(r => price >= r.min && price < r.max);
        if (range) range.count++;
      }
    });

    return ranges.filter(r => r.count > 0);
  };

  const getRatingDistribution = () => {
    const distribution = [
      { name: '5 Stars', value: 0 },
      { name: '4 Stars', value: 0 },
      { name: '3 Stars', value: 0 },
      { name: '2 Stars', value: 0 },
      { name: '1 Star', value: 0 }
    ];

    products.forEach(product => {
      const rating = Math.round(product.rating);
      if (rating >= 1 && rating <= 5) {
        distribution[5 - rating].value++;
      }
    });

    return distribution.filter(d => d.value > 0);
  };

  const getTopProducts = () => {
    return [...products]
      .filter(p => p.rating && p.reviewCount)
      .sort((a, b) => {
        const scoreA = a.rating * Math.log(a.reviewCount + 1);
        const scoreB = b.rating * Math.log(b.reviewCount + 1);
        return scoreB - scoreA;
      })
      .slice(0, 10);
  };

  const getCategoryDistribution = () => {
    const categories = {};

    products.forEach(product => {
      const category = product.category || 'Uncategorized';
      categories[category] = (categories[category] || 0) + 1;
    });

    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-600">
          Market insights and trends
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Products"
          value={stats.totalProducts}
          icon={Package}
        />
        <StatsCard
          title="Average Price"
          value={`$${stats.avgPrice}`}
          icon={DollarSign}
        />
        <StatsCard
          title="Average Rating"
          value={stats.avgRating}
          icon={Star}
        />
        <StatsCard
          title="Total Reviews"
          value={stats.totalReviews.toLocaleString()}
          icon={Activity}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Distribution */}
        <Card title="Price Distribution">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getPriceDistribution()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#2563eb" name="Products" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Rating Distribution */}
        <Card title="Rating Distribution">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={getRatingDistribution()}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {getRatingDistribution().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Category Distribution */}
        <Card title="Top Categories">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getCategoryDistribution()} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Bar dataKey="value" fill="#10b981" name="Products" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Top Products */}
        <Card title="Top Rated Products">
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {getTopProducts().map((product, index) => (
              <div
                key={product.asin}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-600">#{index + 1}</span>
                </div>
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
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {product.rating}
                    </span>
                    <span>•</span>
                    <span>{product.reviewCount?.toLocaleString()} reviews</span>
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  ${product.price}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Market Insights */}
      <Card title="Market Insights">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-600 font-medium mb-1">Price Range</div>
            <div className="text-2xl font-bold text-blue-900">
              ${Math.min(...products.map(p => p.price || Infinity)).toFixed(2)} -
              ${Math.max(...products.map(p => p.price || 0)).toFixed(2)}
            </div>
            <div className="text-xs text-blue-700 mt-1">Across all products</div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-green-600 font-medium mb-1">Highly Rated</div>
            <div className="text-2xl font-bold text-green-900">
              {products.filter(p => p.rating >= 4.5).length}
            </div>
            <div className="text-xs text-green-700 mt-1">Products with 4.5+ stars</div>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-sm text-purple-600 font-medium mb-1">Popular</div>
            <div className="text-2xl font-bold text-purple-900">
              {products.filter(p => p.reviewCount >= 1000).length}
            </div>
            <div className="text-xs text-purple-700 mt-1">Products with 1000+ reviews</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
