# PowerShell script to run subscription plans seeding in Docker production container
# This copies the script into the container and runs it

Write-Host "🐳 Running subscription plans seeding in Docker production container..." -ForegroundColor Cyan

# Check if container is running
$containerStatus = docker-compose -f docker-compose.production.yml ps app1 2>&1
if ($containerStatus -notmatch "Up") {
    Write-Host "❌ Container app1 is not running!" -ForegroundColor Red
    Write-Host "   Please start your production containers first:" -ForegroundColor Yellow
    Write-Host "   docker-compose -f docker-compose.production.yml up -d" -ForegroundColor Yellow
    exit 1
}

# Get container ID
$containerId = docker-compose -f docker-compose.production.yml ps -q app1
if (-not $containerId) {
    Write-Host "❌ Could not find container ID for app1" -ForegroundColor Red
    exit 1
}

# Copy script into container
Write-Host "📦 Copying script into container..." -ForegroundColor Cyan
docker cp scripts/seed-subscription-plans-production.ts "${containerId}:/app/scripts/seed-subscription-plans-production.ts"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to copy script into container" -ForegroundColor Red
    exit 1
}

# Run the script
Write-Host "🚀 Running seeding script..." -ForegroundColor Cyan
docker-compose -f docker-compose.production.yml exec app1 npx ts-node /app/scripts/seed-subscription-plans-production.ts

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Done!" -ForegroundColor Green
} else {
    Write-Host "❌ Seeding failed!" -ForegroundColor Red
    exit 1
}




