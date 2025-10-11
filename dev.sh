#!/bin/bash

# 🚀 DEVELOPMENT DEPLOYMENT SCRIPT
# Simple script to start development environment

set -e

echo "🚀 Starting Development Environment..."

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

if [ ! -f ".env" ]; then
    print_error ".env file not found!"
    print_status "Creating from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_warning "Please edit .env with your development values"
    else
        print_error "No .env.example found. Please create .env file manually"
        exit 1
    fi
fi

# Stop existing containers
print_status "Stopping existing development containers..."
docker-compose -f docker-compose.dev.yml down 2>/dev/null || true

# Build and start services
print_status "Building and starting development stack..."
docker-compose -f docker-compose.dev.yml up --build -d

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 15

# Check service health
print_status "Checking service health..."

# Check app
if docker-compose -f docker-compose.dev.yml ps app | grep -q "Up"; then
    print_status "✅ Application is running"
else
    print_error "❌ Application failed to start"
    docker-compose -f docker-compose.dev.yml logs app
    exit 1
fi

# Check postgres
if docker-compose -f docker-compose.dev.yml ps postgres | grep -q "Up"; then
    print_status "✅ PostgreSQL is running"
else
    print_error "❌ PostgreSQL failed to start"
    docker-compose -f docker-compose.dev.yml logs postgres
fi

# Check redis
if docker-compose -f docker-compose.dev.yml ps redis | grep -q "Up"; then
    print_status "✅ Redis is running"
else
    print_error "❌ Redis failed to start"
    docker-compose -f docker-compose.dev.yml logs redis
fi

# Check nginx
if docker-compose -f docker-compose.dev.yml ps nginx | grep -q "Up"; then
    print_status "✅ Nginx is running"
else
    print_error "❌ Nginx failed to start"
    docker-compose -f docker-compose.dev.yml logs nginx
fi

# Test health endpoint
print_status "Testing health endpoint..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    print_status "✅ Health check passed"
else
    print_warning "⚠️  Health check failed - services might still be starting"
fi

# Display service information
print_status "🎉 Development Environment Started!"
echo ""
echo "📊 Development Services:"
echo "  - Application: http://localhost (via nginx)"
echo "  - Direct App: http://localhost:3001 (bypass nginx)"
echo "  - Health Check: http://localhost/health"
echo "  - API Documentation: http://localhost/api-docs"
echo "  - Prisma Studio: http://localhost:5555"
echo ""
echo "🔧 Database Access:"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo ""
echo "🛠️ Management Commands:"
echo "  - View logs: docker-compose -f docker-compose.dev.yml logs -f"
echo "  - Stop services: docker-compose -f docker-compose.dev.yml down"
echo "  - Restart services: docker-compose -f docker-compose.dev.yml restart"
echo "  - Rebuild: docker-compose -f docker-compose.dev.yml up --build -d"
echo ""
echo "🔥 Development Features:"
echo "  - Hot reload enabled"
echo "  - Direct database access"
echo "  - No rate limiting"
echo "  - Debug-friendly logging"
echo "  - Prisma Studio access"
echo ""
print_status "Development environment is ready! 🎉"


