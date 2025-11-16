# Amazon Scraper Dashboard

A modern, responsive React dashboard for the Amazon Scraper API. Built with React 18, Vite, and Tailwind CSS.

## Features

### 📊 Dashboard
- Real-time statistics overview
- Activity feed with WebSocket updates
- Quick actions for common tasks
- System status monitoring

### 📦 Products Management
- Browse all scraped products
- Search by ASIN or product title
- Add new products via Amazon URL
- Track products for price monitoring
- Scrape product reviews
- Export product data to CSV
- Pagination support

### 💰 Price Tracker
- Interactive price history charts with Recharts
- Price statistics (min, max, average, current)
- Price trend analysis and recommendations
- Real-time price update notifications
- Multi-product tracking

### ⭐ Reviews Analytics
- Browse and filter product reviews
- Rating distribution visualization
- Sentiment analysis (positive/negative/neutral)
- Filter by rating, verified purchase, helpfulness
- Search reviews by content or author
- Review statistics and insights

### 📈 Analytics
- Market overview and insights
- Price distribution charts
- Rating distribution pie charts
- Top products ranking
- Category analysis
- Key metrics dashboard

### ⚙️ Settings
- API configuration and health check
- Auto-refresh settings
- Notification preferences
- Data export (JSON)
- Cache management
- System information

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3
- **Charts**: Recharts 2
- **Icons**: Lucide React
- **Routing**: React Router 6
- **Real-time**: Socket.IO Client
- **Date Utilities**: date-fns

## Getting Started

### Prerequisites

- Node.js >= 14.0.0
- npm or yarn
- Running Amazon Scraper API backend (default: http://localhost:3000)

### Installation

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
```env
VITE_API_URL=http://localhost:3000
```

### Development

Start the development server:

```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173`

**With Backend:**
From the project root, run both backend and frontend:
```bash
npm run dev:all
```

### Building for Production

Build the production bundle:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

The built files will be in the `dist/` directory.

## Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable React components
│   │   ├── Card.jsx
│   │   ├── Layout.jsx
│   │   └── StatsCard.jsx
│   ├── pages/          # Page components
│   │   ├── Dashboard.jsx
│   │   ├── Products.jsx
│   │   ├── PriceTracker.jsx
│   │   ├── Reviews.jsx
│   │   ├── Analytics.jsx
│   │   └── Settings.jsx
│   ├── services/       # API and WebSocket services
│   │   ├── api.js
│   │   └── socket.js
│   ├── App.jsx         # Main app component with routing
│   ├── main.jsx        # React entry point
│   └── index.css       # Global styles and Tailwind
├── public/             # Static assets
├── index.html          # HTML template
├── vite.config.js      # Vite configuration
├── tailwind.config.js  # Tailwind configuration
└── package.json
```

## API Integration

The dashboard connects to the Amazon Scraper API backend. Make sure the backend is running before starting the frontend.

### API Endpoints Used

- `GET /api/health` - Health check
- `GET /api/products` - List products
- `GET /api/products/:asin` - Get product details
- `POST /api/scrape` - Scrape new product
- `POST /api/track` - Track product price
- `POST /api/scrape/reviews` - Scrape reviews
- `GET /api/reviews/:asin` - Get reviews
- `GET /api/prices/:asin/history` - Get price history
- `GET /api/prices/:asin/stats` - Get price statistics
- `GET /api/prices/:asin/analysis` - Get price analysis

### WebSocket Events

- `scrape:completed` - Product scraping finished
- `track:completed` - Price tracking update
- `review:completed` - Review scraping finished

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:3000` |

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Features in Detail

### Real-time Updates

The dashboard uses WebSocket connections to receive real-time updates:
- Product scraping completion
- Price tracking updates
- Activity feed notifications

### Responsive Design

Fully responsive design that works on:
- Desktop (1920px and above)
- Laptop (1024px - 1919px)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

### Data Export

Multiple export formats:
- **CSV**: Product listings
- **JSON**: Complete data export with metadata

### Price Charts

Interactive charts powered by Recharts:
- Line charts for price history
- Bar charts for price distribution
- Pie charts for rating distribution
- Responsive and touch-friendly

## Troubleshooting

### API Connection Issues

If the dashboard shows "API Disconnected":
1. Ensure the backend is running on port 3000
2. Check `VITE_API_URL` in `.env`
3. Verify CORS is enabled on the backend
4. Check browser console for errors

### WebSocket Connection Issues

If real-time updates aren't working:
1. Check Socket.IO is enabled on the backend
2. Verify the WebSocket path is `/api/socket.io`
3. Check browser console for connection errors
4. Ensure no firewall is blocking WebSocket connections

### Build Issues

If the build fails:
1. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
2. Clear Vite cache: `rm -rf .vite`
3. Check Node.js version: `node -v` (should be >= 14.0.0)

## Development Tips

### Hot Module Replacement

Vite provides fast HMR. Changes to React components will update instantly without full page reload.

### API Proxy

During development, API requests to `/api/*` are proxied to `http://localhost:3000` automatically. This is configured in `vite.config.js`.

### Adding New Pages

1. Create component in `src/pages/`
2. Add route in `src/App.jsx`
3. Add navigation link in `src/components/Layout.jsx`

### Custom Styling

Global styles and Tailwind utilities are in `src/index.css`. Custom component classes like `.btn`, `.card`, `.input` are defined there.

## Performance

- Code splitting with React.lazy (can be added)
- Optimized Recharts bundle
- Tailwind CSS purging in production
- Vite's optimized build output

## License

MIT - Same as the main Amazon Scraper project

## Contributing

See the main project README for contribution guidelines.

## Support

For issues and questions:
- GitHub Issues: https://github.com/jslabxyz/js-amz-scraper/issues
- Main Documentation: See root README.md
