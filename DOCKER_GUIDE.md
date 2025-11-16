# Amazon Scraper - Complete Docker Deployment Guide

This guide provides step-by-step instructions for deploying the Amazon Scraper application (API + Dashboard) using Docker.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Architecture Overview](#architecture-overview)
4. [Detailed Setup](#detailed-setup)
5. [Configuration](#configuration)
6. [Running the Application](#running-the-application)
7. [Accessing the Application](#accessing-the-application)
8. [Managing Containers](#managing-containers)
9. [Production Deployment](#production-deployment)
10. [Troubleshooting](#troubleshooting)
11. [Advanced Configuration](#advanced-configuration)

---

## Prerequisites

### Required Software

1. **Docker** (version 20.10 or higher)
   ```bash
   # Check Docker version
   docker --version

   # Install Docker (Ubuntu/Debian)
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh

   # Install Docker (macOS)
   # Download from: https://www.docker.com/products/docker-desktop

   # Install Docker (Windows)
   # Download from: https://www.docker.com/products/docker-desktop
   ```

2. **Docker Compose** (version 2.0 or higher)
   ```bash
   # Check Docker Compose version
   docker-compose --version

   # Usually comes with Docker Desktop
   # For Linux, install separately:
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

### System Requirements

- **Minimum**: 2 CPU cores, 4GB RAM, 10GB disk space
- **Recommended**: 4 CPU cores, 8GB RAM, 20GB disk space
- **Ports Required**: 80 (frontend), 3000 (API), 6379 (Redis)

---

## Quick Start

Get the application running in 5 minutes:

```bash
# 1. Clone the repository
git clone https://github.com/jslabxyz/js-amz-scraper.git
cd js-amz-scraper

# 2. Create environment file
cp .env.docker.example .env

# 3. Build and start all services
docker-compose up -d

# 4. Wait for services to be ready (30-60 seconds)
docker-compose logs -f

# 5. Access the application
# Frontend: http://localhost
# API: http://localhost:3000
# API Docs: http://localhost:3000/api/docs
```

That's it! The dashboard should now be accessible at http://localhost

---

## Architecture Overview

The Docker setup consists of 3 services:

```
┌─────────────────────────────────────────────────┐
│                    Browser                       │
│              http://localhost                    │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
         ┌──────────────────────────┐
         │   Frontend (Nginx)       │
         │   Container              │
         │   Port: 80               │
         │   - React Dashboard      │
         │   - Serves static files  │
         │   - Proxies /api to API  │
         └──────────┬───────────────┘
                    │
                    ▼
         ┌──────────────────────────┐
         │   API (Node.js)          │
         │   Container              │
         │   Port: 3000             │
         │   - REST API             │
         │   - WebSocket            │
         │   - Scraping Engine      │
         │   - SQLite Database      │
         └──────────┬───────────────┘
                    │
                    ▼
         ┌──────────────────────────┐
         │   Redis (Optional)       │
         │   Container              │
         │   Port: 6379             │
         │   - Job Queue            │
         │   - Caching              │
         └──────────────────────────┘
```

### Service Details

1. **Frontend** (`amazon-scraper-frontend`)
   - Technology: React 18 + Vite + Nginx
   - Purpose: User interface
   - Image: Multi-stage build (Node.js → Nginx)
   - Exposes: Port 80

2. **API** (`amazon-scraper-api`)
   - Technology: Node.js 18 + Express + Playwright
   - Purpose: Scraping logic and data management
   - Image: node:18-alpine + Chromium
   - Exposes: Port 3000

3. **Redis** (`amazon-scraper-redis`)
   - Technology: Redis 7
   - Purpose: Job queue and caching (optional)
   - Image: redis:7-alpine
   - Exposes: Port 6379

---

## Detailed Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/jslabxyz/js-amz-scraper.git
cd js-amz-scraper
```

### Step 2: Create Environment Configuration

```bash
# Copy the example environment file
cp .env.docker.example .env

# Edit the file with your preferred settings
nano .env  # or vim .env, or code .env
```

**Important settings to review:**

```bash
# API Port (default: 3000)
API_PORT=3000

# Frontend Port (default: 80, use 8080 if 80 is taken)
FRONTEND_PORT=80

# Frontend API URL (should match API_PORT)
VITE_API_URL=http://localhost:3000

# Enable/Disable features
ENABLE_SWAGGER=true
ENABLE_AUTH=false
ENABLE_QUEUE=false

# Security (IMPORTANT: Change in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### Step 3: Create Data Directories

```bash
# Create directories for persistent data
mkdir -p data logs

# Set proper permissions (Linux/macOS)
chmod 755 data logs
```

### Step 4: Build the Docker Images

```bash
# Build all services
docker-compose build

# Or build specific services
docker-compose build api
docker-compose build frontend
```

**Build output:**
```
[+] Building 45.2s (24/24) FINISHED
 => [api internal] load build definition from Dockerfile
 => [frontend internal] load build definition from Dockerfile
 => [api] transferring context
 => [frontend] transferring context
 ...
 => [api] exporting to image
 => [frontend] exporting to image
```

---

## Configuration

### Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `API_PORT` | 3000 | Port for API server |
| `FRONTEND_PORT` | 80 | Port for frontend dashboard |
| `REDIS_PORT` | 6379 | Port for Redis |
| `NODE_ENV` | production | Node.js environment |
| `LOG_LEVEL` | info | Logging level (debug, info, warn, error) |
| `VITE_API_URL` | http://localhost:3000 | API URL for frontend |
| `ENABLE_AUTH` | false | Enable JWT authentication |
| `JWT_SECRET` | (random) | Secret for JWT tokens |
| `CORS_ORIGIN` | * | CORS allowed origins |
| `RATE_LIMIT_ENABLED` | true | Enable rate limiting |
| `RATE_LIMIT_MAX` | 100 | Max requests per window |
| `ENABLE_QUEUE` | false | Enable Redis job queue |
| `ENABLE_SWAGGER` | true | Enable API documentation |

### Port Configuration

If default ports are already in use, modify `.env`:

```bash
# Use alternative ports
FRONTEND_PORT=8080  # Instead of 80
API_PORT=3001       # Instead of 3000
REDIS_PORT=6380     # Instead of 6379
```

Then access via:
- Frontend: `http://localhost:8080`
- API: `http://localhost:3001`

---

## Running the Application

### Start All Services

```bash
# Start in detached mode (background)
docker-compose up -d

# Start with logs visible (foreground)
docker-compose up

# Start specific services only
docker-compose up -d api frontend
```

### Verify Services are Running

```bash
# Check status of all containers
docker-compose ps

# Expected output:
NAME                        STATUS              PORTS
amazon-scraper-api          Up 2 minutes        0.0.0.0:3000->3000/tcp
amazon-scraper-frontend     Up 2 minutes        0.0.0.0:80->80/tcp
amazon-scraper-redis        Up 2 minutes        0.0.0.0:6379->6379/tcp
```

### Health Checks

```bash
# Check API health
curl http://localhost:3000/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 120.5,
  "database": "connected",
  "version": "1.0.0"
}

# Check frontend health
curl http://localhost/health

# Expected response:
healthy

# Check container health status
docker-compose ps
# Look for "healthy" in STATUS column
```

### View Logs

```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View logs for specific service
docker-compose logs -f api
docker-compose logs -f frontend
docker-compose logs -f redis

# View last 100 lines
docker-compose logs --tail=100

# View logs with timestamps
docker-compose logs -t
```

---

## Accessing the Application

### Frontend Dashboard

**URL**: http://localhost (or http://localhost:8080 if using alternative port)

**Features:**
- Dashboard: Real-time statistics and activity feed
- Products: Browse and manage scraped products
- Price Tracker: View price history and trends
- Reviews: Analyze customer reviews
- Analytics: Market insights and charts
- Settings: Configure API and preferences

**First-time setup:**
1. Navigate to http://localhost
2. Go to Settings → API Configuration
3. Verify API connection shows "Connected"
4. Start adding products!

### REST API

**Base URL**: http://localhost:3000/api

**Interactive Documentation**: http://localhost:3000/api/docs (Swagger UI)

**Example API Calls:**

```bash
# Health check
curl http://localhost:3000/api/health

# Scrape a product
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.amazon.com/dp/B08N5WRWNW",
    "saveToDb": true
  }'

# Get all products
curl http://localhost:3000/api/products

# Get product by ASIN
curl http://localhost:3000/api/products/B08N5WRWNW

# Get price history
curl http://localhost:3000/api/prices/B08N5WRWNW/history
```

### Redis (if enabled)

```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# Check Redis status
docker-compose exec redis redis-cli ping
# Response: PONG

# Monitor Redis commands
docker-compose exec redis redis-cli monitor
```

---

## Managing Containers

### Stop Services

```bash
# Stop all services
docker-compose stop

# Stop specific service
docker-compose stop api
docker-compose stop frontend
```

### Start Services

```bash
# Start all stopped services
docker-compose start

# Start specific service
docker-compose start api
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart api

# Rebuild and restart (after code changes)
docker-compose up -d --build
```

### Remove Containers

```bash
# Stop and remove containers (keeps volumes/data)
docker-compose down

# Remove containers and volumes (DELETE ALL DATA!)
docker-compose down -v

# Remove containers, volumes, and images
docker-compose down -v --rmi all
```

### Scale Services

```bash
# Run multiple API instances (requires load balancer)
docker-compose up -d --scale api=3

# Note: Frontend and Redis cannot be scaled without additional config
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart services
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Or in one command
docker-compose up -d --build --force-recreate
```

---

## Production Deployment

### Security Hardening

1. **Change Default Secrets**
   ```bash
   # Generate secure JWT secret
   openssl rand -base64 64

   # Update .env
   JWT_SECRET=<generated-secret>
   ```

2. **Enable Authentication**
   ```bash
   # In .env
   ENABLE_AUTH=true
   ```

3. **Restrict CORS**
   ```bash
   # In .env
   CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
   ```

4. **Use HTTPS**

   Update `docker-compose.yml` to add SSL termination:

   ```yaml
   frontend:
     ports:
       - "443:443"
       - "80:80"
     volumes:
       - ./ssl:/etc/nginx/ssl
       - ./nginx-ssl.conf:/etc/nginx/conf.d/default.conf
   ```

### Resource Limits

Add resource constraints in `docker-compose.yml`:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

  frontend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.1'
          memory: 128M
```

### Monitoring and Logging

1. **Configure Log Rotation**

   Create `docker-compose.override.yml`:

   ```yaml
   version: '3.8'

   services:
     api:
       logging:
         driver: "json-file"
         options:
           max-size: "10m"
           max-file: "3"

     frontend:
       logging:
         driver: "json-file"
         options:
           max-size: "10m"
           max-file: "3"
   ```

2. **Health Monitoring**

   Services include health checks that Docker monitors:

   ```bash
   # Check health status
   docker inspect amazon-scraper-api | grep -A 10 Health
   ```

### Backup Strategy

```bash
# Backup database
docker-compose exec api tar -czf /tmp/backup.tar.gz /usr/src/app/data
docker cp amazon-scraper-api:/tmp/backup.tar.gz ./backup-$(date +%Y%m%d).tar.gz

# Backup Redis (if enabled)
docker-compose exec redis redis-cli SAVE
docker cp amazon-scraper-redis:/data/dump.rdb ./redis-backup-$(date +%Y%m%d).rdb

# Restore database
docker cp ./backup-20240115.tar.gz amazon-scraper-api:/tmp/
docker-compose exec api tar -xzf /tmp/backup-20240115.tar.gz -C /
```

### Domain and Reverse Proxy

Example Nginx reverse proxy configuration:

```nginx
server {
    listen 80;
    server_name scraper.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name scraper.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Port Already in Use

**Error:** `Bind for 0.0.0.0:80 failed: port is already allocated`

**Solution:**
```bash
# Check what's using the port
sudo lsof -i :80
# or
sudo netstat -tulpn | grep :80

# Option 1: Stop the conflicting service
sudo systemctl stop nginx  # if nginx is using port 80

# Option 2: Change the port in .env
FRONTEND_PORT=8080
```

#### 2. Container Fails to Start

**Check logs:**
```bash
docker-compose logs api
docker-compose logs frontend
```

**Common causes:**
- Missing environment variables
- Permission issues with volumes
- Out of disk space
- Port conflicts

**Solutions:**
```bash
# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d

# Check disk space
df -h

# Check permissions
ls -la data/ logs/
```

#### 3. API Not Responding

**Symptoms:** Frontend shows "API Disconnected"

**Debug steps:**
```bash
# 1. Check if container is running
docker-compose ps api

# 2. Check API logs
docker-compose logs -f api

# 3. Test API directly
curl http://localhost:3000/api/health

# 4. Check from inside container
docker-compose exec api curl http://localhost:3000/api/health

# 5. Restart API service
docker-compose restart api
```

#### 4. Database Issues

**Error:** `SQLITE_CANTOPEN: unable to open database file`

**Solution:**
```bash
# Check data directory exists and has correct permissions
mkdir -p data
chmod 755 data

# Recreate container
docker-compose down
docker-compose up -d
```

#### 5. Frontend Shows Blank Page

**Debug steps:**
```bash
# 1. Check browser console for errors
# Open DevTools (F12) → Console tab

# 2. Check nginx logs
docker-compose logs -f frontend

# 3. Verify build completed
docker-compose exec frontend ls -la /usr/share/nginx/html

# 4. Rebuild frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

#### 6. Scraping Fails

**Error:** `TimeoutError: Navigation timeout exceeded`

**Possible causes:**
- Network issues
- Amazon blocking requests
- Chromium not installed properly

**Solutions:**
```bash
# Check Chromium installation
docker-compose exec api which chromium-browser

# Increase timeout in API
# Edit src/api/controllers/scraper.controller.js
# timeout: 60000 → timeout: 120000

# Check network connectivity
docker-compose exec api ping -c 3 amazon.com

# Rebuild API container
docker-compose build --no-cache api
docker-compose up -d api
```

#### 7. WebSocket Connection Failed

**Symptoms:** Real-time updates not working

**Debug:**
```bash
# Check browser console
# Should see: "WebSocket connected"

# Check nginx configuration
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf

# Ensure WebSocket proxy is configured correctly
# location /api/socket.io should exist
```

#### 8. High Memory Usage

**Monitor resource usage:**
```bash
# Check container stats
docker stats

# Identify memory hogs
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

**Solutions:**
```bash
# Add memory limits in docker-compose.yml
services:
  api:
    mem_limit: 2g

# Or stop unused containers
docker-compose stop redis  # if not using queue
```

### Getting Help

1. **Check Logs First:**
   ```bash
   docker-compose logs -f
   ```

2. **Verify Environment:**
   ```bash
   docker-compose config
   ```

3. **Test Connectivity:**
   ```bash
   # From host
   curl http://localhost:3000/api/health
   curl http://localhost/health

   # From container
   docker-compose exec api curl http://localhost:3000/api/health
   ```

4. **Container Shell Access:**
   ```bash
   # Access API container
   docker-compose exec api sh

   # Access frontend container
   docker-compose exec frontend sh
   ```

5. **Report Issues:**
   - GitHub Issues: https://github.com/jslabxyz/js-amz-scraper/issues
   - Include: OS, Docker version, logs, docker-compose.yml

---

## Advanced Configuration

### Using Docker Compose Override

Create `docker-compose.override.yml` for local customizations:

```yaml
version: '3.8'

services:
  api:
    environment:
      - LOG_LEVEL=debug
      - ENABLE_MONITORING=true
    volumes:
      - ./src:/usr/src/app/src  # Hot reload for development

  frontend:
    ports:
      - "8080:80"  # Use different port locally
```

### Multi-Environment Setup

**Development:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

**Production:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
```

### Adding External Services

**Example: Add PostgreSQL**

```yaml
services:
  postgres:
    image: postgres:15-alpine
    container_name: amazon-scraper-postgres
    environment:
      - POSTGRES_DB=amazon_scraper
      - POSTGRES_USER=scraper
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - scraper-network

volumes:
  postgres-data:
```

### Docker Swarm Deployment

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml amazon-scraper

# Check services
docker service ls

# Scale API
docker service scale amazon-scraper_api=3
```

### Kubernetes Deployment

Convert Docker Compose to Kubernetes:

```bash
# Install kompose
curl -L https://github.com/kubernetes/kompose/releases/download/v1.28.0/kompose-linux-amd64 -o kompose
chmod +x kompose
sudo mv kompose /usr/local/bin/

# Convert
kompose convert -f docker-compose.yml

# Deploy
kubectl apply -f .
```

---

## Performance Optimization

### Build Optimization

```dockerfile
# Multi-stage builds (already implemented)
# Use .dockerignore to exclude unnecessary files
# Layer caching by ordering COPY commands properly
```

**Create `.dockerignore`:**

```
node_modules
npm-debug.log
.git
.env
.env.*
dist
coverage
*.md
.vscode
.idea
test
docs
```

### Runtime Optimization

1. **Enable Redis for Job Queue:**
   ```bash
   # In .env
   ENABLE_QUEUE=true
   ```

2. **Adjust Worker Threads:**
   ```yaml
   api:
     environment:
       - MAX_CONCURRENT_JOBS=5
       - UV_THREADPOOL_SIZE=4
   ```

3. **Use Production Mode:**
   ```bash
   NODE_ENV=production
   ```

### Network Optimization

```yaml
networks:
  scraper-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.25.0.0/16
```

---

## Maintenance

### Regular Tasks

**Weekly:**
```bash
# Update images
docker-compose pull

# Rebuild and restart
docker-compose up -d --build

# Clean old images
docker image prune -a -f
```

**Monthly:**
```bash
# Full system cleanup
docker system prune -a --volumes -f

# Backup database
./backup.sh  # Create this script based on backup section
```

### Monitoring

```bash
# Container stats
docker stats

# System-wide Docker info
docker system df

# Inspect specific container
docker inspect amazon-scraper-api
```

---

## Summary

You now have:
- ✅ Complete Docker setup for Amazon Scraper
- ✅ Frontend + API + Redis running in containers
- ✅ Persistent data with volumes
- ✅ Health checks and monitoring
- ✅ Production-ready configuration
- ✅ Comprehensive troubleshooting guide

**Next Steps:**
1. Start the application: `docker-compose up -d`
2. Access dashboard: http://localhost
3. Add your first product
4. Start tracking prices!

**Need Help?**
- Documentation: See README.md and API.md
- Issues: https://github.com/jslabxyz/js-amz-scraper/issues
- Logs: `docker-compose logs -f`

Happy scraping! 🚀
