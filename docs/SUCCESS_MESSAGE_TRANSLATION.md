# Success Message Translation Implementation

## Overview

Success messages are now automatically translated based on the `Accept-Language` header (just like error messages). This provides a consistent multilingual experience across all API responses.

## How It Works

### 1. Translation Keys

Success messages use translation keys that start with `success.` (e.g., `success.appointment.created`). These keys are defined in `src/services/translationServiceFallback.ts` for both Turkish (`tr`) and English (`en`).

### 2. Automatic Translation

The response utility functions (`sendSuccessResponse`, `sendPaginatedResponse`, `sendSuccessWithMeta`) automatically detect if a message is a translation key and translate it using the language detected from the request.

### 3. Language Detection

Language is detected from:
1. `Accept-Language` header (sent by frontend)
2. User's language preference (if authenticated)
3. Default: `tr` (Turkish)

## Usage

### Basic Usage (with translation key)

```typescript
import { sendSuccessResponse } from '../utils/responseUtils';

// In your controller method
await sendSuccessResponse(
  res,
  'success.appointment.created',  // Translation key
  appointmentData,
  201,
  req  // Request object for language detection
);
```

### With Parameters

For dynamic messages with parameters:

```typescript
await sendSuccessResponse(
  res,
  'success.appointment.batchUpdated',  // Translation key
  undefined,
  200,
  req,
  { count: 5 }  // Parameters for translation
);
```

### Response Structure

Success responses now include both the translation key and translated message:

```json
{
  "success": true,
  "statusCode": 200,
  "key": "success.appointment.created",
  "message": "Randevu başarıyla oluşturuldu",  // Translated message
  "data": { ... }
}
```

## Available Translation Keys

### General
- `success.general.created` - `{{resource}} created successfully`
- `success.general.updated` - `{{resource}} updated successfully`
- `success.general.deleted` - `{{resource}} deleted successfully`
- `success.general.retrieved` - `{{resource}} retrieved successfully`
- `success.general.saved` - `{{resource}} saved successfully`

### Discount Codes
- `success.discountCode.created` - Discount code created successfully
- `success.discountCode.applied` - Discount code applied successfully

### Appointments
- `success.appointment.created` - Appointment created successfully
- `success.appointment.updated` - Appointment updated successfully
- `success.appointment.cancelled` - Appointment cancelled successfully
- `success.appointment.confirmed` - Appointment confirmed successfully
- `success.appointment.batchUpdated` - `{{count}} appointments updated successfully`
- `success.appointment.batchCancelled` - `{{count}} appointments cancelled successfully`

### Contact
- `success.contact.sent` - Message sent successfully

### Business
- `success.business.created` - Business created successfully
- `success.business.updated` - Business updated successfully

### Services
- `success.service.created` - Service created successfully
- `success.service.updated` - Service updated successfully
- `success.service.deleted` - Service deleted successfully

### Staff
- `success.staff.created` - Staff member created successfully
- `success.staff.updated` - Staff member updated successfully
- `success.staff.deleted` - Staff member deleted successfully

### Customers
- `success.customer.created` - Customer created successfully
- `success.customer.updated` - Customer updated successfully
- `success.customer.deleted` - Customer deleted successfully

### Subscriptions
- `success.subscription.created` - Subscription created successfully
- `success.subscription.updated` - Subscription updated successfully
- `success.subscription.cancelled` - Subscription cancelled successfully

### Authentication
- `success.auth.login` - Login successful
- `success.auth.logout` - Logout successful
- `success.auth.registered` - Registration successful
- `success.auth.verified` - Account verified successfully
- `success.auth.passwordReset` - Password reset link sent
- `success.auth.passwordChanged` - Password changed successfully

## Migration Guide

### Updating Existing Controllers

**Before:**
```typescript
sendSuccessResponse(
  res,
  'Discount code created successfully',
  discountCode,
  201
);
```

**After:**
```typescript
await sendSuccessResponse(
  res,
  'success.discountCode.created',  // Use translation key
  discountCode,
  201,
  req  // Pass request object for language detection
);
```

### Important Notes

1. **Make functions async**: Controller methods that use `sendSuccessResponse` must be `async` and use `await`.

2. **Pass request object**: Always pass `req` as the 5th parameter to enable translation.

3. **Use translation keys**: Replace hardcoded messages with translation keys from `success.*` namespace.

4. **Backward compatibility**: If you pass a plain string (not starting with `success.`), it will be used as-is without translation.

## Adding New Success Messages

To add new success message translations:

1. Add the translation key and messages to `src/services/translationServiceFallback.ts`:

```typescript
tr: {
  'success.newFeature.created': 'Yeni özellik başarıyla oluşturuldu',
  // ...
},
en: {
  'success.newFeature.created': 'New feature created successfully',
  // ...
}
```

2. Use it in your controller:

```typescript
await sendSuccessResponse(
  res,
  'success.newFeature.created',
  data,
  201,
  req
);
```

## Frontend Integration

The frontend receives both the translation key and translated message:

```typescript
{
  success: true,
  statusCode: 200,
  key: "success.appointment.created",  // Use this for frontend translation if needed
  message: "Randevu başarıyla oluşturuldu",  // Or use this translated message directly
  data: { ... }
}
```

Frontend can:
- Use the `key` with their own i18n system: `t(response.key)`
- Use the `message` directly (already translated by backend)
- Use a hybrid approach: try frontend translation first, fallback to backend message

**📖 For detailed frontend integration guide, see:** [`FRONTEND_SUCCESS_MESSAGE_TRANSLATION.md`](./FRONTEND_SUCCESS_MESSAGE_TRANSLATION.md)

## Benefits

1. **Consistent multilingual support**: All messages (errors and success) are now translated
2. **Centralized translations**: All translations in one place
3. **Automatic language detection**: No manual language passing needed
4. **Frontend flexibility**: Frontend can use either the key or the translated message
5. **Type safety**: Translation keys are defined in code

## Testing

Test with different `Accept-Language` headers:

```bash
# Turkish
curl -H "Accept-Language: tr" http://localhost:3000/api/v1/endpoint

# English
curl -H "Accept-Language: en" http://localhost:3000/api/v1/endpoint
```

The response `message` field should be in the requested language.

