#!/bin/bash

# Production Deployment Script for RandevuBu
# This script handles complete production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting RandevuBu Production Deployment${NC}"

# Check if required files exist
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

required_files=(
    ".env.production"
    "docker-compose.prod.yml"
    "nginx/nginx.conf"
    "Dockerfile"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Required file missing: $file${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ All required files present${NC}"

# Load environment variables
if [ -f ".env.production" ]; then
    source .env.production
else
    echo -e "${RED}❌ .env.production file not found${NC}"
    exit 1
fi

# Check if required environment variables are set
required_vars=("POSTGRES_PASSWORD" "REDIS_PASSWORD")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Required environment variable not set: $var${NC}"
        exit 1
    fi
done

# Stop any existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose -f docker-compose.prod.yml down --remove-orphans

# Pull latest images
echo -e "${YELLOW}📦 Pulling latest Docker images...${NC}"
docker-compose -f docker-compose.prod.yml pull

# Build application image
echo -e "${YELLOW}🏗️  Building application image...${NC}"
docker-compose -f docker-compose.prod.yml build --no-cache app

# Create necessary directories
echo -e "${YELLOW}📁 Creating directories...${NC}"
mkdir -p logs/{app,nginx,postgres,redis}
mkdir -p backup
mkdir -p monitoring/{prometheus,grafana}

# Set proper permissions
echo -e "${YELLOW}🔐 Setting permissions...${NC}"
chmod 700 backup
chmod 755 logs
chmod 600 .env.production

# Start core services (database and cache first)
echo -e "${YELLOW}🗄️  Starting database and cache services...${NC}"
docker-compose -f docker-compose.prod.yml up -d postgres redis

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
timeout 60s bash -c 'until docker-compose -f docker-compose.prod.yml ps postgres | grep -q "healthy"; do sleep 2; done'
timeout 60s bash -c 'until docker-compose -f docker-compose.prod.yml ps redis | grep -q "healthy"; do sleep 2; done'

# Run database migrations
echo -e "${YELLOW}🔄 Running database migrations...${NC}"
docker-compose -f docker-compose.prod.yml run --rm app npm run db:migrate

# Start application
echo -e "${YELLOW}🚀 Starting application...${NC}"
docker-compose -f docker-compose.prod.yml up -d app

# Wait for application to be ready
echo -e "${YELLOW}⏳ Waiting for application to be ready...${NC}"
timeout 60s bash -c 'until docker-compose -f docker-compose.prod.yml ps app | grep -q "healthy"; do sleep 2; done'

# Start reverse proxy
echo -e "${YELLOW}🌐 Starting nginx reverse proxy...${NC}"
docker-compose -f docker-compose.prod.yml up -d nginx

# Start monitoring services
echo -e "${YELLOW}📊 Starting monitoring services...${NC}"
docker-compose -f docker-compose.prod.yml up -d prometheus grafana

# Final health check
echo -e "${YELLOW}🏥 Performing health checks...${NC}"
sleep 10

# Check if all services are running
services=("postgres" "redis" "app" "nginx" "prometheus" "grafana")
for service in "${services[@]}"; do
    if docker-compose -f docker-compose.prod.yml ps "$service" | grep -q "Up"; then
        echo -e "${GREEN}✅ $service is running${NC}"
    else
        echo -e "${RED}❌ $service failed to start${NC}"
        docker-compose -f docker-compose.prod.yml logs "$service"
        exit 1
    fi
done

# Test application endpoints
echo -e "${YELLOW}🧪 Testing application endpoints...${NC}"

# Health check
if curl -f -s http://localhost/health > /dev/null; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
    exit 1
fi

# API check
if curl -f -s http://localhost/api/v1/health > /dev/null; then
    echo -e "${GREEN}✅ API endpoint accessible${NC}"
else
    echo -e "${RED}❌ API endpoint failed${NC}"
    exit 1
fi

# Display deployment summary
echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Service Status:${NC}"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo -e "${BLUE}🌐 Access URLs:${NC}"
echo -e "  Main Application: http://localhost"
echo -e "  API Health: http://localhost/health"
echo -e "  API Documentation: http://localhost/api-docs"
echo -e "  Prometheus: http://localhost:9090 (internal)"
echo -e "  Grafana: http://localhost:3001 (internal)"

echo ""
echo -e "${BLUE}📝 Useful Commands:${NC}"
echo -e "  View logs: docker-compose -f docker-compose.prod.yml logs -f [service]"
echo -e "  Restart service: docker-compose -f docker-compose.prod.yml restart [service]"
echo -e "  Scale app: docker-compose -f docker-compose.prod.yml up -d --scale app=3"
echo -e "  Backup database: ./scripts/backup.sh"
echo -e "  Update SSL: ./scripts/ssl-setup.sh"

echo ""
echo -e "${YELLOW}⚠️  Next Steps:${NC}"
echo -e "  1. Set up SSL certificates: ./scripts/ssl-setup.sh"
echo -e "  2. Configure domain DNS"
echo -e "  3. Set up monitoring alerts"
echo -e "  4. Schedule regular backups"
echo -e "  5. Configure log rotation"

echo ""
echo -e "${GREEN}✅ Production deployment complete!${NC}"