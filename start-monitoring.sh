#!/bin/bash

# Start RandevuBu Server with Monitoring Stack
echo "🚀 Starting RandevuBu Server with Monitoring..."

# Start the main application
docker-compose up -d

# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

echo "✅ Services started!"
echo ""
echo "📊 Access your services:"
echo "  • Application: http://localhost:3001"
echo "  • Health Check: http://localhost:3001/health"
echo "  • Grafana: http://localhost:3000 (admin/admin123)"
echo "  • Prometheus: http://localhost:9090"
echo "  • Node Exporter: http://localhost:9100"
echo "  • cAdvisor: http://localhost:8080"
echo ""
echo "🔧 To stop monitoring:"
echo "  docker-compose -f docker-compose.monitoring.yml down"
echo ""
echo "🔧 To stop everything:"
echo "  docker-compose down && docker-compose -f docker-compose.monitoring.yml down"
