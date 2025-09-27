#!/bin/bash

# One-time migration script for production
# Run this script to apply database migrations

set -e

echo "🔄 Running database migrations for production..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    exit 1
fi

# Run migrations
echo "⏳ Applying database migrations..."
npx prisma migrate deploy

echo "✅ Database migrations completed successfully!"

# Show migration status
echo "📊 Migration status:"
npx prisma migrate status

echo "🎉 All done! Your database is now up to date."
