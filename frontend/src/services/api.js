const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Health
  async getHealth() {
    return this.request('/health');
  }

  // Products
  async scrapeProduct(url, saveToDb = true) {
    return this.request('/products/scrape', {
      method: 'POST',
      body: JSON.stringify({ url, saveToDb })
    });
  }

  async getProduct(asin) {
    return this.request(`/products/${asin}`);
  }

  async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/products?${query}`);
  }

  async trackProduct(asin) {
    return this.request(`/products/${asin}/track`, {
      method: 'POST'
    });
  }

  // Reviews
  async scrapeReviews(asin, maxPages = 5, saveToDb = true) {
    return this.request('/reviews/scrape', {
      method: 'POST',
      body: JSON.stringify({ asin, maxPages, saveToDb })
    });
  }

  async getReviews(asin, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/reviews/${asin}?${query}`);
  }

  // Prices
  async getPriceHistory(asin, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/prices/${asin}/history?${query}`);
  }

  async getPriceStats(asin) {
    return this.request(`/prices/${asin}/stats`);
  }

  async getPriceAnalysis(asin, days = 30) {
    return this.request(`/prices/${asin}/analysis?days=${days}`);
  }

  async getPriceChartData(asin, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/prices/${asin}/chart?${query}`);
  }
}

export default new ApiService();
