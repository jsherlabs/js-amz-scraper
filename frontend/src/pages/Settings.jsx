import { useState, useEffect } from 'react';
import { Save, RefreshCw, Database, Bell, Download, Info } from 'lucide-react';
import Card from '../components/Card';
import api from '../services/api';

export default function Settings() {
  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_API_URL || 'http://localhost:3000');
  const [apiStatus, setApiStatus] = useState('checking');
  const [settings, setSettings] = useState({
    autoRefresh: true,
    refreshInterval: 60,
    notifications: true,
    darkMode: false,
    maxRetries: 3,
    timeout: 30000
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    checkApiHealth();
    loadSettings();
  }, []);

  const checkApiHealth = async () => {
    try {
      setApiStatus('checking');
      const response = await api.healthCheck();
      setApiStatus(response.success ? 'connected' : 'error');
    } catch (error) {
      setApiStatus('error');
    }
  };

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('app-settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('app-settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExportData = async () => {
    try {
      const response = await api.getProducts({ limit: 10000 });
      if (response.success && response.data) {
        const products = response.data.products || [];

        const exportData = {
          exportDate: new Date().toISOString(),
          totalProducts: products.length,
          products: products.map(p => ({
            asin: p.asin,
            title: p.title,
            price: p.price,
            rating: p.rating,
            reviewCount: p.reviewCount,
            category: p.category,
            url: p.url,
            images: p.images,
            createdAt: p.created_at
          }))
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `amazon-scraper-export-${new Date().toISOString()}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('Failed to export data: ' + error.message);
    }
  };

  const handleClearCache = () => {
    if (confirm('Are you sure you want to clear all cached data? This action cannot be undone.')) {
      localStorage.clear();
      alert('Cache cleared successfully. The page will reload.');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Configure your Amazon Scraper dashboard
        </p>
      </div>

      {/* API Configuration */}
      <Card title="API Configuration">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Base URL
            </label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="input"
              placeholder="http://localhost:3000"
            />
            <p className="mt-1 text-xs text-gray-500">
              The base URL for the backend API server
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                apiStatus === 'connected' ? 'bg-green-500' :
                apiStatus === 'error' ? 'bg-red-500' :
                'bg-yellow-500'
              }`}></div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  API Status: {apiStatus === 'connected' ? 'Connected' : apiStatus === 'error' ? 'Error' : 'Checking...'}
                </div>
                <div className="text-xs text-gray-600">
                  {apiStatus === 'connected' && 'API is healthy and responding'}
                  {apiStatus === 'error' && 'Cannot connect to API server'}
                  {apiStatus === 'checking' && 'Checking API health...'}
                </div>
              </div>
            </div>
            <button
              onClick={checkApiHealth}
              className="btn btn-secondary flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Check
            </button>
          </div>
        </div>
      </Card>

      {/* General Settings */}
      <Card title="General Settings">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">Auto Refresh</div>
              <div className="text-xs text-gray-600">
                Automatically refresh data at intervals
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoRefresh}
                onChange={(e) => setSettings({ ...settings, autoRefresh: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {settings.autoRefresh && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Refresh Interval (seconds)
              </label>
              <input
                type="number"
                value={settings.refreshInterval}
                onChange={(e) => setSettings({ ...settings, refreshInterval: parseInt(e.target.value) })}
                className="input"
                min="10"
                max="300"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">Notifications</div>
              <div className="text-xs text-gray-600">
                Show browser notifications for updates
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Retries
            </label>
            <input
              type="number"
              value={settings.maxRetries}
              onChange={(e) => setSettings({ ...settings, maxRetries: parseInt(e.target.value) })}
              className="input"
              min="0"
              max="10"
            />
            <p className="mt-1 text-xs text-gray-500">
              Maximum number of retry attempts for failed requests
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Request Timeout (ms)
            </label>
            <input
              type="number"
              value={settings.timeout}
              onChange={(e) => setSettings({ ...settings, timeout: parseInt(e.target.value) })}
              className="input"
              min="5000"
              max="60000"
              step="1000"
            />
            <p className="mt-1 text-xs text-gray-500">
              Maximum time to wait for API responses
            </p>
          </div>

          <div className="pt-4 border-t">
            <button
              onClick={handleSaveSettings}
              className="btn btn-primary flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saved ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        </div>
      </Card>

      {/* Data Management */}
      <Card title="Data Management">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-sm font-medium text-blue-900">Export All Data</div>
                <div className="text-xs text-blue-700">
                  Download all product data as JSON
                </div>
              </div>
            </div>
            <button onClick={handleExportData} className="btn btn-secondary">
              Export
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-red-600" />
              <div>
                <div className="text-sm font-medium text-red-900">Clear Cache</div>
                <div className="text-xs text-red-700">
                  Remove all cached data and settings
                </div>
              </div>
            </div>
            <button onClick={handleClearCache} className="btn btn-secondary">
              Clear
            </button>
          </div>
        </div>
      </Card>

      {/* About */}
      <Card title="About">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary-100 rounded-lg">
            <Info className="w-6 h-6 text-primary-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Amazon Scraper Dashboard
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              A comprehensive web scraping tool for Amazon product data, price tracking,
              and review analysis. Built with React, Node.js, and modern web technologies.
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-600">Version</div>
                <div className="font-medium">1.0.0</div>
              </div>
              <div>
                <div className="text-gray-600">Framework</div>
                <div className="font-medium">React 18 + Vite</div>
              </div>
              <div>
                <div className="text-gray-600">Backend</div>
                <div className="font-medium">Node.js + Express</div>
              </div>
              <div>
                <div className="text-gray-600">Database</div>
                <div className="font-medium">SQLite</div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
