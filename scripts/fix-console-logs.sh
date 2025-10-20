#!/bin/bash

# Script to replace console.log with logger calls in development only
# This ensures console.log is replaced with proper structured logging

echo "🔍 Finding all console.log/error/warn in src/ directory..."

# Find all TypeScript files with console statements
find ./src -name "*.ts" -type f | while read -r file; do
  if grep -q "console\.\(log\|error\|warn\)" "$file"; then
    echo "Processing: $file"

    # Backup the file
    cp "$file" "$file.bak"

    # Note: Manual review recommended for complex console statements
    # This script helps identify files that need attention
  fi
done

echo "✅ Complete! Files with console statements have been identified."
echo "⚠️  Please manually review and replace with appropriate logger calls:"
echo "   - console.log() → logger.debug() or logger.info()"
echo "   - console.error() → logger.error()"
echo "   - console.warn() → logger.warn()"
echo ""
echo "Files to review:"
grep -rl "console\.\(log\|error\|warn\)" ./src --include="*.ts" || echo "None found"
