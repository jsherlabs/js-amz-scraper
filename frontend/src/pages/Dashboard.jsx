import { useState, useEffect } from 'react';
import { Package, TrendingDown, Bell, Activity } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import Card from '../components/Card';
import api from '../services/api';
import socket from '../services/socket';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    trackedProducts: 0,
    priceAlerts: 0,
    recentActivity: []
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    setupWebSocket();

    return () => {
      socket.off('scrape:completed');
      socket.off('track:completed');
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Load products to get stats
      const productsData = await api.getProducts({ limit: 100 });

      setStats({
        totalProducts: productsData.data?.pagination?.total || 0,
        trackedProducts: 42, // This would come from a real endpoint
        priceAlerts: 8, // This would come from a real endpoint
        recentActivity: []
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    socket.connect();

    socket.on('scrape:completed', (data) => {
      addActivity({
        type: 'scrape',
        message: `Product ${data.asin} scraped successfully`,
        time: new Date(data.timestamp)
      });
    });

    socket.on('track:completed', (data) => {
      addActivity({
        type: 'track',
        message: `Price updated for ${data.asin}: ${data.currentPrice}`,
        time: new Date(data.timestamp)
      });
    });
  };

  const addActivity = (activity) => {
    setRecentActivity((prev) => [activity, ...prev].slice(0, 10));
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Overview of your Amazon scraping activity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Products"
          value={stats.totalProducts}
          icon={Package}
        />
        <StatsCard
          title="Tracked Products"
          value={stats.trackedProducts}
          icon={TrendingDown}
        />
        <StatsCard
          title="Price Alerts"
          value={stats.priceAlerts}
          icon={Bell}
          trend={{ value: '+3 this week', positive: true }}
        />
        <StatsCard
          title="Recent Activity"
          value={recentActivity.length}
          icon={Activity}
        />
      </div>

      {/* Recent Activity */}
      <Card title="Recent Activity">
        {recentActivity.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No recent activity. Start by adding a product!
          </p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'scrape' ? 'bg-blue-500' : 'bg-green-500'
                  }`}></div>
                  <span className="text-sm text-gray-700">{activity.message}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(activity.time)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <Card title="Quick Actions">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="btn btn-primary">
            Add Product
          </button>
          <button className="btn btn-secondary">
            Track Prices
          </button>
          <button className="btn btn-secondary">
            Export Data
          </button>
        </div>
      </Card>
    </div>
  );
}
