# Script to run the rating fields migration on production Docker
# Usage: .\scripts\run-migration-production.ps1

Write-Host "🚀 Running migration to add rating fields to businesses table..." -ForegroundColor Cyan

# Copy SQL file to container
docker compose -f docker-compose.production.yml cp scripts/add-rating-fields.sql app1:/tmp/add-rating-fields.sql

# Execute SQL using Prisma
docker compose -f docker-compose.production.yml exec app1 npx prisma db execute --file /tmp/add-rating-fields.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Migration failed. Check the error above." -ForegroundColor Red
    exit $LASTEXITCODE
}


