# Translation System Migration Guide

## Overview

This guide covers the migration from the old hardcoded translation system to a production-ready, database-driven translation service.

## What Changed

### Before (Old System)
- Hardcoded translations in `src/utils/notificationTranslations.ts`
- Inconsistent with frontend translation system
- No caching or performance optimization
- Difficult to maintain and scale

### After (New System)
- Database-driven translations with Redis caching
- Centralized translation service
- Consistent with frontend system
- Production-ready with proper error handling
- Easy to maintain and scale

## Migration Steps

### 1. Database Migration

```bash
# Run the Prisma migration to add the translations table
npx prisma migrate dev --name add-translations-table

# Generate Prisma client
npx prisma generate
```

### 2. Install Dependencies

```bash
# Install Redis client (if not already installed)
npm install ioredis
npm install @types/ioredis --save-dev
```

### 3. Environment Variables

Add these to your `.env` file:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Translation Configuration
DEFAULT_LANGUAGE=tr
SUPPORTED_LANGUAGES=tr,en
```

### 4. Migrate Existing Translations

```bash
# Run the migration script
npm run migrate:translations
```

### 5. Update Services

The notification service has been updated to use the new translation system. No additional changes needed.

## Production Deployment

### 1. Database Setup

```bash
# Run migrations in production
npx prisma migrate deploy

# Migrate translations
npm run migrate:translations
```

### 2. Redis Setup

Ensure Redis is running and accessible:

```bash
# Test Redis connection
redis-cli ping
```

### 3. Verify Translation System

```bash
# Test translation service
npm run test:translations
```

## API Usage

### Basic Translation

```typescript
import { TranslationService } from './services/translationService';

const translationService = new TranslationService(prisma);

// Translate a message
const message = await translationService.translate(
  'notifications.appointmentReminder',
  {
    businessName: 'My Business',
    serviceName: 'Haircut',
    time: '14:30'
  },
  'tr'
);
```

### Bulk Translation

```typescript
// Translate multiple keys at once
const messages = await translationService.translateBulk(
  ['notifications.appointmentReminder', 'notifications.availabilityAlert'],
  { businessName: 'My Business' },
  'tr'
);
```

### Cache Management

```typescript
// Clear all translations from cache
await translationService.clearCache();

// Clear specific pattern
await translationService.clearCache('notifications.*');
```

## Monitoring and Maintenance

### 1. Translation Validation

```typescript
// Validate all translations
const validation = await translationService.validateTranslations();
console.log('Missing translations:', validation.missing);
console.log('Invalid translations:', validation.invalid);
```

### 2. Performance Monitoring

Monitor Redis cache hit rates and database query performance for translations.

### 3. Adding New Languages

1. Add language to `SUPPORTED_LANGUAGES` environment variable
2. Add translations to database
3. Update frontend translation files

## Troubleshooting

### Common Issues

1. **Translation not found**: Check if translation exists in database
2. **Cache issues**: Clear Redis cache and restart service
3. **Performance issues**: Check Redis connection and cache configuration

### Debug Mode

Enable debug logging by setting:

```env
DEBUG=translation:*
```

## Rollback Plan

If issues occur, you can temporarily rollback by:

1. Reverting to the old `notificationTranslations.ts` file
2. Updating imports in `notificationService.ts`
3. Removing the new translation service

## Future Enhancements

1. **Translation Management UI**: Build an admin interface for managing translations
2. **Real-time Updates**: Implement WebSocket updates for translation changes
3. **Translation Analytics**: Track which translations are used most
4. **Auto-translation**: Integrate with translation APIs for new languages
5. **Version Control**: Track translation changes and rollback capabilities
