# Amazon Scraper REST API Documentation

Production-ready REST API for scraping Amazon products, reviews, and tracking prices.

## Table of Contents

- [Quick Start](#quick-start)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [WebSocket Events](#websocket-events)
- [Docker Deployment](#docker-deployment)
- [Configuration](#configuration)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## Quick Start

### Installation

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Start the API server
npm start
```

The API will be available at `http://localhost:3000`

### Using Docker

```bash
# Build and start all services
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

## Authentication

Authentication is **optional** and can be enabled via environment variables.

### Enable Authentication

```bash
ENABLE_AUTH=true
JWT_SECRET=your-secret-key-here
```

### Get a Token

```bash
# For testing, generate a token (requires authentication to be enabled)
curl -X POST http://localhost:3000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "your-api-key"}'
```

### Use Token in Requests

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/products/B0123456789
```

## API Endpoints

### Health Check

#### GET /api/health

Simple health check to verify the API is running.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "uptime": 3600.5,
    "environment": "production"
  }
}
```

#### GET /api/health/detailed

Detailed health check including database status.

### Products

#### POST /api/products/scrape

Scrape a product from Amazon.

**Authentication:** Required (if enabled)
**Rate Limit:** 20 requests / 15 minutes

**Request:**
```json
{
  "url": "https://www.amazon.com/dp/B0123456789",
  "saveToDb": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "product": {
      "asin": "B0123456789",
      "title": "Product Name",
      "price": "$29.99",
      "rating": "4.5 out of 5 stars",
      "reviewCount": "1,234",
      ...
    },
    "productId": 1,
    "scrapedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/products/scrape \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "url": "https://www.amazon.com/dp/B0123456789",
    "saveToDb": true
  }'
```

#### GET /api/products/:asin

Get product details from database.

**Parameters:**
- `asin` (path) - Amazon product ASIN

**Response:**
```json
{
  "success": true,
  "data": {
    "product": {
      "asin": "B0123456789",
      "title": "Product Name",
      "current_price": 29.99,
      "rating": 4.5,
      "features": [...],
      "specifications": [...],
      "images": [...]
    }
  }
}
```

**Example:**
```bash
curl http://localhost:3000/api/products/B0123456789
```

#### GET /api/products

Search and list products.

**Query Parameters:**
- `search` - Search term (optional)
- `limit` - Results per page (default: 20)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [...],
    "pagination": {
      "total": 100,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

**Example:**
```bash
curl "http://localhost:3000/api/products?search=laptop&limit=10"
```

#### POST /api/products/:asin/track

Track product price (scrape current price and save to history).

**Authentication:** Required (if enabled)
**Rate Limit:** 20 requests / 15 minutes

**Response:**
```json
{
  "success": true,
  "data": {
    "asin": "B0123456789",
    "title": "Product Name",
    "currentPrice": "$29.99",
    "inStock": true,
    "statistics": {
      "min_price": 24.99,
      "max_price": 39.99,
      "avg_price": "29.99",
      "data_points": 15
    }
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/products/B0123456789/track \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Reviews

#### POST /api/reviews/scrape

Scrape reviews for a product.

**Authentication:** Required (if enabled)
**Rate Limit:** 20 requests / 15 minutes

**Request:**
```json
{
  "asin": "B0123456789",
  "maxPages": 5,
  "saveToDb": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "asin": "B0123456789",
    "summary": {
      "overallRating": "4.5 out of 5 stars",
      "totalReviews": "1,234 ratings",
      "ratingDistribution": {...}
    },
    "reviews": [...],
    "totalReviews": 50,
    "savedCount": 50,
    "scrapedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/reviews/scrape \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "asin": "B0123456789",
    "maxPages": 5
  }'
```

#### GET /api/reviews/:asin

Get reviews for a product from database.

**Query Parameters:**
- `minRating` - Minimum rating filter (optional)
- `limit` - Results per page (default: 20)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "asin": "B0123456789",
    "reviews": [...],
    "count": 20,
    "pagination": {
      "limit": 20,
      "offset": 0
    }
  }
}
```

**Example:**
```bash
curl "http://localhost:3000/api/reviews/B0123456789?minRating=4&limit=10"
```

### Price Tracking

#### GET /api/prices/:asin/history

Get price history for a product.

**Query Parameters:**
- `limit` - Maximum number of records (default: 100)
- `days` - Filter by last N days (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "asin": "B0123456789",
    "history": [
      {
        "price": 29.99,
        "list_price": 39.99,
        "in_stock": 1,
        "recorded_at": "2024-01-15T10:30:00.000Z"
      }
    ],
    "count": 15
  }
}
```

**Example:**
```bash
curl "http://localhost:3000/api/prices/B0123456789/history?days=30"
```

#### GET /api/prices/:asin/stats

Get price statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "asin": "B0123456789",
    "stats": {
      "min_price": 24.99,
      "max_price": 39.99,
      "avg_price": "29.99",
      "data_points": 15,
      "first_recorded": "2024-01-01T00:00:00.000Z",
      "last_recorded": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

#### GET /api/prices/:asin/analysis

Get price analysis and buying recommendation.

**Query Parameters:**
- `days` - Analysis period in days (default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "asin": "B0123456789",
    "analysis": {
      "period": "Last 30 days",
      "dataPoints": 15,
      "currentPrice": 29.99,
      "statistics": {
        "min": 24.99,
        "max": 39.99,
        "average": "29.50",
        "change": "2.00",
        "changePercent": "7.14"
      },
      "priceDrops": [...],
      "recommendation": {
        "score": 4,
        "message": "Good time to buy. Price is below average.",
        "details": {...}
      }
    }
  }
}
```

**Example:**
```bash
curl "http://localhost:3000/api/prices/B0123456789/analysis?days=60"
```

#### GET /api/prices/:asin/chart

Get price chart data.

**Query Parameters:**
- `days` - Chart period in days (default: 30)
- `limit` - Maximum data points (default: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "asin": "B0123456789",
    "chartData": [
      {
        "date": "2024-01-15T10:30:00.000Z",
        "price": 29.99,
        "listPrice": 39.99,
        "inStock": true
      }
    ],
    "count": 15
  }
}
```

## WebSocket Events

Connect to WebSocket for real-time scraping updates:

```javascript
const socket = io('http://localhost:3000', {
  path: '/api/socket.io'
});

// Listen for events
socket.on('scrape:started', (data) => {
  console.log('Scraping started:', data);
});

socket.on('scrape:completed', (data) => {
  console.log('Scraping completed:', data);
});

socket.on('scrape:failed', (data) => {
  console.error('Scraping failed:', data);
});

socket.on('track:started', (data) => {
  console.log('Price tracking started:', data);
});

socket.on('track:completed', (data) => {
  console.log('Price tracking completed:', data);
});

socket.on('reviews:scraping:progress', (data) => {
  console.log('Reviews progress:', data);
});
```

### Available Events

- `scrape:started` - Product scraping started
- `scrape:completed` - Product scraping completed
- `scrape:failed` - Product scraping failed
- `track:started` - Price tracking started
- `track:completed` - Price tracking completed
- `track:failed` - Price tracking failed
- `reviews:scraping:started` - Review scraping started
- `reviews:scraping:progress` - Review scraping progress
- `reviews:scraping:completed` - Review scraping completed
- `reviews:scraping:failed` - Review scraping failed

## Docker Deployment

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

### Start Services

```bash
# Build and start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### Production Configuration

For production, update your `.env`:

```bash
NODE_ENV=production
ENABLE_AUTH=true
JWT_SECRET=your-strong-secret-key
RATE_LIMIT_ENABLED=true
CORS_ORIGIN=https://yourdomain.com
```

## Configuration

All configuration is done via environment variables. See `.env.example` for all options.

### Key Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `API_PORT` | 3000 | API server port |
| `ENABLE_AUTH` | false | Enable JWT authentication |
| `ENABLE_SWAGGER` | true | Enable Swagger documentation |
| `RATE_LIMIT_MAX` | 100 | Max requests per window |
| `DB_PATH` | ./amazon_scraper.db | SQLite database path |

## Error Handling

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Error Codes

- `VALIDATION_ERROR` (400) - Invalid request parameters
- `UNAUTHORIZED` (401) - Invalid or missing authentication
- `NOT_FOUND` (404) - Resource not found
- `SCRAPING_ERROR` (422) - Error during scraping operation
- `RATE_LIMIT_EXCEEDED` (429) - Too many requests
- `INTERNAL_ERROR` (500) - Server error

## Rate Limiting

Rate limiting is enabled by default to prevent abuse.

### Default Limits

- **Standard endpoints**: 100 requests / 15 minutes
- **Scraping endpoints**: 20 requests / 15 minutes

### Rate Limit Headers

All responses include rate limit information:

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1642253400
```

### Disable Rate Limiting

For development, you can disable rate limiting:

```bash
RATE_LIMIT_ENABLED=false
```

## Swagger Documentation

Interactive API documentation is available at:

```
http://localhost:3000/api/docs
```

This provides a full interactive interface to test all API endpoints.

## Examples

### Complete Workflow Example

```bash
# 1. Scrape a product
curl -X POST http://localhost:3000/api/products/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.amazon.com/dp/B0123456789"}'

# 2. Get product details
curl http://localhost:3000/api/products/B0123456789

# 3. Scrape reviews
curl -X POST http://localhost:3000/api/reviews/scrape \
  -H "Content-Type: application/json" \
  -d '{"asin": "B0123456789", "maxPages": 3}'

# 4. Track price
curl -X POST http://localhost:3000/api/products/B0123456789/track

# 5. Get price analysis
curl http://localhost:3000/api/prices/B0123456789/analysis?days=30
```

### Using with cURL

```bash
# Save token to variable
TOKEN="your-jwt-token"

# Make authenticated request
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/products/scrape \
  -d '{"url": "https://www.amazon.com/dp/B0123456789"}'
```

### Using with JavaScript

```javascript
const API_URL = 'http://localhost:3000';

// Scrape product
async function scrapeProduct(url) {
  const response = await fetch(`${API_URL}/api/products/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url, saveToDb: true })
  });

  const data = await response.json();
  return data;
}

// Get price history
async function getPriceHistory(asin, days = 30) {
  const response = await fetch(
    `${API_URL}/api/prices/${asin}/history?days=${days}`
  );

  const data = await response.json();
  return data;
}
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/jslabxyz/js-amz-scraper/issues
- Documentation: https://github.com/jslabxyz/js-amz-scraper
