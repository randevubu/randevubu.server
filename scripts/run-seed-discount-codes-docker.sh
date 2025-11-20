#!/bin/bash

# Script to run discount codes seeding in Docker production container
# This copies the script into the container and runs it

echo "🐳 Running discount codes seeding in Docker production container..."

# Check if container is running
if ! docker-compose -f docker-compose.production.yml ps app1 | grep -q "Up"; then
    echo "❌ Container app1 is not running!"
    echo "   Please start your production containers first:"
    echo "   docker-compose -f docker-compose.production.yml up -d"
    exit 1
fi

# Copy script into container
echo "📦 Copying script into container..."
docker cp scripts/seed-comprehensive-discount-codes.ts $(docker-compose -f docker-compose.production.yml ps -q app1):/app/scripts/seed-comprehensive-discount-codes.ts

# Run the script
echo "🚀 Running seeding script..."
docker-compose -f docker-compose.production.yml exec app1 npx ts-node /app/scripts/seed-comprehensive-discount-codes.ts

# Clean up (optional - comment out if you want to keep it)
# echo "🧹 Cleaning up..."
# docker-compose -f docker-compose.production.yml exec app1 rm /app/scripts/seed-comprehensive-discount-codes.ts

echo "✅ Done!"




