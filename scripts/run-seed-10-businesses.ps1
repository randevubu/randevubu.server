# Script to run seed-10-businesses.ts with correct DATABASE_URL
# This handles both local and Docker database connections

Write-Host "🌱 Running 10 Businesses Seed Script..." -ForegroundColor Cyan
Write-Host ""

# Check if database is running in Docker
$dockerRunning = docker ps --filter "name=postgres" --format "{{.Names}}" | Select-String "postgres"

if ($dockerRunning) {
    Write-Host "✅ Docker database detected" -ForegroundColor Green
    Write-Host "📝 Using localhost connection for local execution" -ForegroundColor Yellow
    Write-Host ""
    
    # Temporarily override DATABASE_URL to use localhost
    $env:DATABASE_URL = $env:DATABASE_URL -replace "postgres:", "localhost:"
    
    # If DATABASE_URL doesn't exist or doesn't have postgres:, set a default
    if (-not $env:DATABASE_URL -or $env:DATABASE_URL -notmatch "postgres") {
        $env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/randevubu?schema=public"
        Write-Host "⚠️  DATABASE_URL not found, using default: $env:DATABASE_URL" -ForegroundColor Yellow
    }
    
    Write-Host "🔗 Connecting to: $($env:DATABASE_URL -replace ':[^:@]+@', ':****@')" -ForegroundColor Gray
    Write-Host ""
    
    # Run the seed script
    npx ts-node prisma/seed-10-businesses.ts
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Seed completed successfully!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Seed failed. Check the error messages above." -ForegroundColor Red
        exit $LASTEXITCODE
    }
} else {
    Write-Host "❌ No Docker database found. Please:" -ForegroundColor Red
    Write-Host "   1. Start your database: docker-compose up -d postgres" -ForegroundColor Yellow
    Write-Host "   2. Or update DATABASE_URL in .env file" -ForegroundColor Yellow
    exit 1
}





