@echo off
echo 🚀 Starting RandevuBu Server with Monitoring...

REM Start the main application with monitoring
docker-compose -f docker-compose.production.yml up -d

echo ✅ Services started!
echo.
echo 📊 Access your services:
echo   • Application: http://localhost:3001
echo   • Health Check: http://localhost:3001/health
echo   • Grafana: http://localhost:4000 (admin/admin123)
echo   • Prometheus: http://localhost:9090
echo.
echo 🔧 To stop services:
echo   docker-compose -f docker-compose.production.yml down
