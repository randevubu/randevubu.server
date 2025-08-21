# Authentication & Authorization System Documentation

## Overview

This document outlines the phone-based authentication and authorization system implemented for RandevuBu Server. The system follows enterprise-grade security practices inspired by companies like Airbnb, emphasizing security, scalability, and user experience.

## Architecture

### Core Components

1. **Phone Verification Service** - Handles SMS verification codes
2. **Token Service** - Manages JWT tokens and refresh token rotation
3. **User Service** - User management with security features
4. **Authentication Middleware** - Request authentication and authorization
5. **Audit System** - Comprehensive logging and monitoring

## Security Features

### 1. Phone Number Verification

**Why Phone-Only Authentication?**
- Reduces friction for users (no passwords to remember)
- Lower abandonment rates compared to email verification
- Built-in 2FA through SMS delivery
- Harder to create fake accounts
- Better mobile-first user experience

**Security Measures:**
- Phone number normalization using E.164 format
- Rate limiting (3 requests per 5 minutes per IP)
- Daily limits (10 attempts per phone, 50 per IP)
- Secure 6-digit codes with SHA-256 hashing
- 10-minute expiration for verification codes
- Maximum 3 verification attempts per code
- Automatic cooldown periods

### 2. JWT Token Management

**Token Structure:**
- **Access Tokens**: Short-lived (15 minutes) for API access
- **Refresh Tokens**: Long-lived (30 days) for token renewal
- **Secure Storage**: Refresh tokens stored in database with metadata

**Security Features:**
- Token rotation on each refresh
- Device fingerprinting (User-Agent, IP, Device ID)
- Automatic cleanup of expired tokens
- Immediate revocation on logout/security events
- Cryptographically secure random token generation

### 3. Account Security

**Brute Force Protection:**
- Failed attempt tracking (max 5 attempts)
- Progressive account locking (30 minutes)
- IP-based rate limiting
- Automatic unlock after timeout

**Account Management:**
- Soft deletion with audit trail
- Phone number change with verification
- Device session management
- Security event logging

### 4. Audit & Monitoring

**Comprehensive Logging:**
- All authentication events
- Failed login attempts
- Account modifications
- Phone number changes
- Token usage patterns

**Security Monitoring:**
- Rate limit violations
- Suspicious login patterns
- Failed verification attempts
- Account lockouts

## Database Schema

### Users Table
```sql
- id: Unique identifier (CUID)
- phone_number: E.164 formatted (unique)
- is_verified: Phone verification status
- is_active: Account status
- profile fields: firstName, lastName, avatar, timezone, language
- security fields: lastLoginAt, failedLoginAttempts, lockedUntil
- audit fields: createdAt, updatedAt, deletedAt
```

### Phone Verification Table
```sql
- id: Unique identifier
- user_id: Foreign key to users (nullable)
- phone_number: Phone number being verified
- code: Hashed verification code
- purpose: Verification reason (REGISTRATION, LOGIN, PHONE_CHANGE, etc.)
- attempts: Current attempt count
- expires_at: Code expiration time
```

### Refresh Tokens Table
```sql
- id: Unique identifier
- user_id: Foreign key to users
- token: Unique token value
- expires_at: Token expiration
- device_id, user_agent, ip_address: Device context
- is_revoked: Revocation status
```

### Audit Logs Table
```sql
- id: Unique identifier
- user_id: Associated user (nullable)
- action: Type of action performed
- entity: Entity type affected
- details: JSON metadata
- ip_address, user_agent: Request context
```

## API Endpoints

### Authentication Flow

#### 1. Request Verification Code
```http
POST /api/v1/auth/send-verification
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "purpose": "REGISTRATION"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "data": {
    "phoneNumber": "+123****7890",
    "expiresIn": 600
  }
}
```

#### 2. Verify Code & Login/Register
```http
POST /api/v1/auth/verify-login
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "verificationCode": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "ckl123...",
      "phoneNumber": "+1234567890",
      "firstName": null,
      "isVerified": true,
      "createdAt": "2023-01-01T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ...",
      "expiresIn": 900,
      "refreshExpiresIn": 2592000
    },
    "isNewUser": false
  }
}
```

#### 3. Refresh Access Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJ..."
}
```

#### 4. Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "refreshToken": "eyJ..."
}
```

### Profile Management

#### Get Profile
```http
GET /api/v1/auth/profile
Authorization: Bearer <access_token>
```

#### Update Profile
```http
PATCH /api/v1/auth/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "timezone": "America/New_York"
}
```

#### Change Phone Number
```http
POST /api/v1/auth/change-phone
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "newPhoneNumber": "+1987654321",
  "verificationCode": "654321"
}
```

## Rate Limiting Strategy

### Verification Endpoints
- **SMS Sending**: 3 requests per 5 minutes per IP
- **Daily Limit**: 10 codes per phone number, 50 per IP
- **Cooldown**: 5 minutes between code requests

### Authentication Endpoints
- **Login/Register**: 10 attempts per 15 minutes per IP
- **Token Refresh**: 10 attempts per 15 minutes per IP
- **Account Changes**: 5 attempts per hour per user

### Profile Endpoints
- **Updates**: 20 requests per 15 minutes per user
- **Stats**: 5 requests per minute per user

## Security Best Practices Implemented

### 1. Input Validation
- Phone number format validation using libphonenumber-js
- Request body validation with custom middleware
- SQL injection prevention through Prisma ORM
- XSS protection via helmet middleware

### 2. Error Handling
- Generic error messages to prevent information leakage
- Detailed logging for debugging without exposing sensitive data
- Consistent error response format
- Request ID tracking for support

### 3. Data Protection
- Phone number masking in logs
- Secure code hashing with SHA-256
- Token encryption and secure storage
- PII handling compliance ready

### 4. Infrastructure Security
- CORS configuration for specific origins
- Content Security Policy headers
- Rate limiting at multiple levels
- Request size limits
- Compression for performance

### 5. Monitoring & Alerts
- Structured logging with Winston
- Audit trail for all user actions
- Security event detection
- Performance monitoring ready

## Environment Variables

```env
# Required
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=your-256-bit-secret

# Optional
API_VERSION=v1
CORS_ORIGINS=https://yourdomain.com
REDIS_URL=redis://localhost:6379
```

## Production Deployment Checklist

### Security
- [ ] Generate strong JWT_SECRET (256+ bits)
- [ ] Configure proper CORS origins
- [ ] Set up SSL/TLS certificates
- [ ] Configure rate limiting
- [ ] Set up WAF (Web Application Firewall)

### Database
- [ ] Run Prisma migrations
- [ ] Set up database backups
- [ ] Configure connection pooling
- [ ] Set up monitoring

### Monitoring
- [ ] Configure log aggregation
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure performance monitoring
- [ ] Set up security alerts

### SMS Provider
- [ ] Configure SMS service (Twilio, AWS SNS, etc.)
- [ ] Set up delivery tracking
- [ ] Configure fallback providers
- [ ] Monitor SMS costs and delivery rates

## Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## Testing the Authentication Flow

### 1. Send Verification Code
```bash
curl -X POST http://localhost:3000/api/v1/auth/send-verification \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890", "purpose": "REGISTRATION"}'
```

### 2. Verify and Login (use code from logs in development)
```bash
curl -X POST http://localhost:3000/api/v1/auth/verify-login \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890", "verificationCode": "123456"}'
```

### 3. Access Protected Route
```bash
curl -X GET http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Future Enhancements

1. **Multi-factor Authentication**
   - TOTP support for high-security accounts
   - Backup codes for account recovery

2. **Advanced Security**
   - Device fingerprinting
   - Behavioral analytics
   - Risk scoring

3. **User Experience**
   - Magic links as SMS alternative
   - Biometric authentication
   - Social login integration (optional)

4. **Enterprise Features**
   - SSO integration
   - Role-based access control
   - API key management

## Troubleshooting

### Common Issues

1. **Phone Number Not Accepted**
   - Ensure E.164 format (+1234567890)
   - Check libphonenumber-js compatibility

2. **Verification Code Not Working**
   - Check expiration (10 minutes)
   - Verify attempt count (max 3)
   - Check for case sensitivity

3. **Token Errors**
   - Verify JWT_SECRET configuration
   - Check token expiration
   - Confirm refresh token validity

4. **Rate Limiting Issues**
   - Check rate limit headers in response
   - Wait for cooldown period
   - Verify IP allowlists if configured

This authentication system provides a robust, secure, and scalable foundation for user management while maintaining an excellent user experience through phone-based verification.