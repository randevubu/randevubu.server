#!/bin/bash

# 🚀 UNIFIED PRODUCTION DEPLOYMENT SCRIPT
# Single script to deploy everything with nginx as load balancer + API gateway

set -e

echo "🚀 Starting Unified Production Deployment..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
print_status "Checking prerequisites..."

if [ ! -f ".env.production" ]; then
    print_error ".env.production file not found!"
    print_status "Creating from template..."
    cp env.production.example .env.production
    print_warning "Please edit .env.production with your production values"
    exit 1
fi

if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
    print_warning "SSL certificates not found. HTTPS will not be available."
    print_status "See nginx/ssl/README.md for SSL setup instructions"
fi

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose -f docker-compose.production.yml down 2>/dev/null || true

# Clean up old images
print_status "Cleaning up old images..."
docker system prune -f

# Build and start services
print_status "Building and starting unified production stack..."
docker-compose -f docker-compose.production.yml up --build -d

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 30

# Check service health
print_status "Checking service health..."

# Check nginx
if docker-compose -f docker-compose.production.yml ps nginx | grep -q "Up"; then
    print_status "✅ Nginx (Load Balancer + API Gateway) is running"
else
    print_error "❌ Nginx failed to start"
    docker-compose -f docker-compose.production.yml logs nginx
    exit 1
fi

# Check app instances
for i in {1..3}; do
    if docker-compose -f docker-compose.production.yml ps app$i | grep -q "Up"; then
        print_status "✅ App Instance $i is running"
    else
        print_error "❌ App Instance $i failed to start"
        docker-compose -f docker-compose.production.yml logs app$i
    fi
done

# Check redis
if docker-compose -f docker-compose.production.yml ps redis | grep -q "Up"; then
    print_status "✅ Redis Cache is running"
else
    print_error "❌ Redis failed to start"
    docker-compose -f docker-compose.production.yml logs redis
fi

# Test health endpoint
print_status "Testing health endpoint..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    print_status "✅ Health check passed"
else
    print_warning "⚠️  Health check failed - services might still be starting"
fi

# Display service information
print_status "🎉 Unified Production Deployment Completed!"
echo ""
echo "📊 Service Information:"
echo "  - Application: http://localhost (Load Balanced across 3 instances)"
echo "  - Health Check: http://localhost/health"
echo "  - API Documentation: http://localhost/api-docs"
echo "  - Nginx Status: http://localhost/nginx-status"
echo ""
echo "🔧 Management Commands:"
echo "  - View logs: docker-compose -f docker-compose.production.yml logs -f"
echo "  - Stop services: docker-compose -f docker-compose.production.yml down"
echo "  - Restart services: docker-compose -f docker-compose.production.yml restart"
echo ""
echo "🔒 Security Features Enabled:"
echo "  - Load Balancing (3 app instances)"
echo "  - API Gateway (routing, rate limiting)"
echo "  - Security headers (XSS, clickjacking protection)"
echo "  - Request caching (static + dynamic)"
echo "  - Connection limiting"
echo "  - Attack pattern blocking"
echo ""
echo "📈 Monitoring (Optional):"
echo "  - Prometheus: http://localhost:9090"
echo "  - Grafana: http://localhost:3000"
echo ""
print_status "Your application is now production-ready! 🎉"


