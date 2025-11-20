@echo off
REM Script to run discount codes seeding in Docker production container (Windows)
REM This copies the script into the container and runs it

echo 🐳 Running discount codes seeding in Docker production container...

REM Check if container is running
docker-compose -f docker-compose.production.yml ps app1 | findstr "Up" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Container app1 is not running!
    echo    Please start your production containers first:
    echo    docker-compose -f docker-compose.production.yml up -d
    exit /b 1
)

REM Get container ID
for /f "tokens=1" %%i in ('docker-compose -f docker-compose.production.yml ps -q app1') do set CONTAINER_ID=%%i

REM Copy script into container
echo 📦 Copying script into container...
docker cp scripts/seed-comprehensive-discount-codes.ts %CONTAINER_ID%:/app/scripts/seed-comprehensive-discount-codes.ts

REM Run the script
echo 🚀 Running seeding script...
docker-compose -f docker-compose.production.yml exec app1 npx ts-node /app/scripts/seed-comprehensive-discount-codes.ts

REM Clean up (optional - comment out if you want to keep it)
REM echo 🧹 Cleaning up...
REM docker-compose -f docker-compose.production.yml exec app1 rm /app/scripts/seed-comprehensive-discount-codes.ts

echo ✅ Done!




