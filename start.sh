#!/bin/bash

# Production startup script for RandevuBu
# This script runs database migrations before starting the application

set -e

echo "🚀 Starting RandevuBu Server..."

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; do
  echo "Database not ready, waiting..."
  sleep 2
done

echo "✅ Database is ready"

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

echo "✅ Database migrations completed"

# Start the application
echo "🚀 Starting application..."
exec node dist/index.js
