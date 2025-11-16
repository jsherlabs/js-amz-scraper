# Docker Quick Start Guide

Get the Amazon Scraper application running in 5 minutes with Docker!

## Prerequisites

- Docker installed (version 20.10+)
- Docker Compose installed (version 2.0+)
- 4GB RAM, 10GB disk space
- Ports 80, 3000, 6379 available

## Quick Start (5 Minutes)

### Step 1: Clone Repository

```bash
git clone https://github.com/jslabxyz/js-amz-scraper.git
cd js-amz-scraper
```

### Step 2: Create Environment File

```bash
cp .env.docker.example .env
```

**Optional**: Edit `.env` to customize ports or settings:
```bash
nano .env  # or vim .env, or code .env
```

### Step 3: Start Application

```bash
docker-compose up -d
```

This command will:
- Build the Docker images (first time only, ~2-3 minutes)
- Start all services (API, Frontend, Redis)
- Run health checks

### Step 4: Wait for Services to Start

```bash
# Watch the logs
docker-compose logs -f
```

Wait for these messages:
```
amazon-scraper-api        | Server started on port 3000
amazon-scraper-frontend   | Configuration complete; ready for start up
amazon-scraper-redis      | Ready to accept connections
```

Press `Ctrl+C` to exit log view (services continue running).

### Step 5: Access the Application

**Dashboard**: Open your browser to http://localhost

**API**: http://localhost:3000

**API Docs**: http://localhost:3000/api/docs

## Verify Everything Works

### Test 1: Check Service Health

```bash
# Check all containers are running
docker-compose ps

# Expected output:
# NAME                        STATUS              PORTS
# amazon-scraper-api          Up (healthy)        0.0.0.0:3000->3000/tcp
# amazon-scraper-frontend     Up (healthy)        0.0.0.0:80->80/tcp
# amazon-scraper-redis        Up (healthy)        0.0.0.0:6379->6379/tcp
```

### Test 2: API Health Check

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": "connected"
}
```

### Test 3: Frontend

Visit http://localhost in your browser. You should see the Amazon Scraper Dashboard.

## First Scrape

### Using the Dashboard

1. Open http://localhost
2. Click "Add Product" button
3. Paste an Amazon product URL (e.g., `https://www.amazon.com/dp/B08N5WRWNW`)
4. Click "Add Product"
5. Wait for scraping to complete
6. View the product in the Products page

### Using the API

```bash
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.amazon.com/dp/B08N5WRWNW",
    "saveToDb": true
  }'
```

## Managing the Application

### Stop the Application

```bash
docker-compose stop
```

### Start the Application

```bash
docker-compose start
```

### Restart the Application

```bash
docker-compose restart
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f frontend
docker-compose logs -f redis
```

### Update the Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### Remove Everything

```bash
# Stop and remove containers (keeps data)
docker-compose down

# Remove containers AND data (CAUTION: deletes database!)
docker-compose down -v
```

## Common Issues

### Port 80 Already in Use

If port 80 is already in use (e.g., by Apache/Nginx):

**Option 1**: Stop the conflicting service
```bash
sudo systemctl stop nginx
# or
sudo systemctl stop apache2
```

**Option 2**: Use a different port

Edit `.env`:
```bash
FRONTEND_PORT=8080  # Use port 8080 instead
```

Then access via http://localhost:8080

### API Not Responding

```bash
# Check if container is running
docker-compose ps api

# Check logs for errors
docker-compose logs -f api

# Restart the API
docker-compose restart api
```

### Database Permission Issues

```bash
# Create data directory with proper permissions
mkdir -p data
chmod 755 data

# Restart services
docker-compose restart
```

### Frontend Shows Blank Page

```bash
# Rebuild frontend from scratch
docker-compose build --no-cache frontend
docker-compose up -d frontend

# Check browser console (F12) for errors
```

## Architecture

```
┌────────────────┐
│    Browser     │
│  localhost:80  │
└───────┬────────┘
        │
        ▼
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│    Frontend    │────▶│      API       │────▶│     Redis      │
│     (Nginx)    │     │   (Node.js)    │     │    (Queue)     │
│   Port: 80     │     │   Port: 3000   │     │   Port: 6379   │
└────────────────┘     └────────────────┘     └────────────────┘
                              │
                              ▼
                       ┌────────────┐
                       │   SQLite   │
                       │  Database  │
                       └────────────┘
```

## What's Running?

| Service | Container Name | Purpose | Port |
|---------|---------------|---------|------|
| Frontend | amazon-scraper-frontend | React dashboard + Nginx | 80 |
| API | amazon-scraper-api | REST API + Scraping | 3000 |
| Redis | amazon-scraper-redis | Job queue (optional) | 6379 |

## Environment Variables

The most common settings in `.env`:

```bash
# Frontend port (default: 80)
FRONTEND_PORT=80

# API port (default: 3000)
API_PORT=3000

# Frontend API URL (should match API_PORT)
VITE_API_URL=http://localhost:3000

# Enable Swagger API docs (default: true)
ENABLE_SWAGGER=true

# Enable authentication (default: false)
ENABLE_AUTH=false

# CORS origin (default: all allowed)
CORS_ORIGIN=*
```

## Production Deployment

For production deployment, see the comprehensive [DOCKER_GUIDE.md](DOCKER_GUIDE.md) which covers:

- Security hardening
- SSL/HTTPS setup
- Resource limits
- Monitoring and logging
- Backup strategies
- Reverse proxy configuration
- Performance optimization
- And much more!

## Getting Help

**Logs**:
```bash
docker-compose logs -f
```

**Container shell access**:
```bash
# API container
docker-compose exec api sh

# Frontend container
docker-compose exec frontend sh
```

**Full documentation**:
- Complete Docker Guide: [DOCKER_GUIDE.md](DOCKER_GUIDE.md)
- Main README: [README.md](README.md)
- API Documentation: http://localhost:3000/api/docs (when running)

**Issues**:
- GitHub: https://github.com/jslabxyz/js-amz-scraper/issues

## Next Steps

Once everything is running:

1. **Add Products**: Click "Add Product" in the dashboard
2. **Track Prices**: Enable price tracking for products
3. **Scrape Reviews**: Gather customer reviews
4. **View Analytics**: Check the Analytics page for insights
5. **Export Data**: Export products to CSV or JSON

---

**That's it!** You now have a fully functional Amazon scraper with a modern dashboard running in Docker containers. 🚀

Happy scraping!
