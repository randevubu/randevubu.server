# Phone Number Update API Documentation

## Overview

This document describes the backend API endpoints for updating a user's phone number. The process uses a two-step OTP (One-Time Password) SMS verification flow to securely update a user's phone number.

**API Version**: v1  
**Base URL**: `/api/v1`

---

## Process Flow

The phone number update consists of **2 steps**:

1. **Request OTP Code**: Send SMS with 6-digit code to the new phone number
2. **Verify & Update**: Submit the OTP code along with the new phone number to complete the update

**⚠️ Important**: After successful phone number update, all existing authentication tokens are revoked. The user must log in again with the new phone number.

---

## Endpoints

### 1. Send Verification Code

**Endpoint**: `POST /api/v1/auth/send-verification`

**Description**: Sends a 6-digit verification code via SMS to the specified phone number.

**Authentication**: Not required (public endpoint)

**Request Body**:
```json
{
  "phoneNumber": "+905551234567",
  "purpose": "PHONE_CHANGE"
}
```

**Request Schema**:
- `phoneNumber` (string, required): Phone number in E.164 format (e.g., "+905551234567")
  - Must be valid phone number format
  - Will be normalized to E.164 format by backend
- `purpose` (string, required): Must be exactly `"PHONE_CHANGE"`

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "data": {
    "phoneNumber": "+905****4567",
    "expiresIn": 600,
    "purpose": "PHONE_CHANGE"
  }
}
```

**Response Fields**:
- `phoneNumber`: Masked version of the phone number for display
- `expiresIn`: Expiration time in seconds (600 = 10 minutes)
- `purpose`: The verification purpose used

**Error Responses**:

| Status | Error Type | Description |
|--------|-----------|-------------|
| 400 | ValidationError | Invalid phone number format or missing fields |
| 429 | RateLimitError | Too many requests (see rate limiting section) |

**Rate Limiting**:
- **SMS Sending**: 3 requests per 5 minutes per IP
- **Daily Limit**: 10 codes per phone number, 50 per IP
- **Cooldown**: 5 minutes between code requests for the same phone number

**Rate Limit Error Response** (429):
```json
{
  "success": false,
  "message": "Too many verification requests. Please try again later.",
  "error": {
    "message": "Rate limit exceeded",
    "retryAfter": 300
  }
}
```

---

### 2. Change Phone Number

**Endpoint**: `POST /api/v1/users/change-phone`

**Description**: Verifies the OTP code and updates the user's phone number if verification succeeds.

**Authentication**: Required (Bearer token)

**Request Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "newPhoneNumber": "+905551234567",
  "verificationCode": "123456"
}
```

**Request Schema**:
- `newPhoneNumber` (string, required): New phone number in E.164 format
  - Must match the phone number used in Step 1
  - Must be valid phone number format
  - Will be normalized to E.164 format by backend
- `verificationCode` (string, required): 6-digit OTP code received via SMS
  - Must be exactly 6 digits
  - Numeric only

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Phone number changed successfully. Please login again with new number.",
  "data": null
}
```

**Error Responses**:

| Status | Error Type | Description |
|--------|-----------|-------------|
| 400 | ValidationError | Invalid phone number format or verification code format |
| 401 | UnauthorizedError | Invalid or expired verification code, or missing/invalid auth token |
| 409 | PhoneAlreadyExistsError | Phone number is already registered to another user |
| 429 | RateLimitError | Too many attempts (5 attempts per 15 minutes per user) |
| 500 | InternalServerError | Server error |

**Invalid Code Error Response** (401):
```json
{
  "success": false,
  "message": "Invalid verification code",
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid verification code"
  }
}
```

**Phone Already Exists Error Response** (409):
```json
{
  "success": false,
  "message": "This phone number is already registered",
  "error": {
    "code": "PHONE_ALREADY_EXISTS",
    "message": "This phone number is already registered"
  }
}
```

**Rate Limiting**:
- **Change Phone Attempts**: 5 attempts per 15 minutes per user
- **Verification Code**: Maximum 5 attempts per code before it's invalidated

---

## Backend Behavior

### Phone Number Normalization

The backend automatically normalizes phone numbers to E.164 format:
- Input: `"905551234567"` → Output: `"+905551234567"`
- Input: `"+90 555 123 45 67"` → Output: `"+905551234567"`
- Invalid formats will be rejected with 400 error

### Verification Code

- **Code Format**: 6-digit numeric code
- **Expiration**: 10 minutes from generation
- **Max Attempts**: 5 attempts per code
- **Purpose**: `PHONE_CHANGE` (must match between request and verification)

### Security Features

1. **Token Revocation**: After successful phone number update:
   - All existing access tokens are revoked
   - All existing refresh tokens are revoked
   - User must log in again with the new phone number

2. **Phone Number Uniqueness**: 
   - Backend checks if phone number is already in use
   - If phone number belongs to another user, update fails with 409 error
   - User cannot update to their own current phone number (should be prevented in UI)

3. **Audit Logging**: 
   - All phone number changes are logged in audit logs
   - Includes masked old and new phone numbers
   - Includes IP address and user agent

4. **Rate Limiting**: 
   - Prevents abuse and spam
   - Applied at both IP and user level
   - Cooldown periods enforced

---

## Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request format or missing required fields |
| `UNAUTHORIZED` | 401 | Invalid/expired verification code or missing auth token |
| `PHONE_ALREADY_EXISTS` | 409 | Phone number is already registered to another user |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests or attempts |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

---

## Example API Calls

### Request OTP Code

```bash
curl -X POST http://localhost:3000/api/v1/auth/send-verification \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+905551234567",
    "purpose": "PHONE_CHANGE"
  }'
```

### Verify and Update Phone Number

```bash
curl -X POST http://localhost:3000/api/v1/users/change-phone \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "newPhoneNumber": "+905551234567",
    "verificationCode": "123456"
  }'
```

---

## Notes

1. **Phone Number Format**: Always use E.164 format (`+[country code][number]`)
2. **OTP Code**: Must be exactly 6 digits, numeric only
3. **Token Expiration**: After successful update, all tokens are invalidated
4. **Re-authentication**: User must log in again after phone number change
5. **Rate Limits**: Respect rate limiting to avoid blocking
6. **Error Handling**: Always check error response codes and messages

---

**Last Updated**: 2025-01-XX  
**API Version**: v1







