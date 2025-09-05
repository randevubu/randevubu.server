# İleti Merkezi SMS API Configuration Guide

## Setup Instructions

1. **Get API Credentials**:
   - Visit [İleti Merkezi Panel](https://panel.iletimerkezi.com/)
   - Create an account or login
   - Go to Settings → Security → Access Permissions
   - Enable "Allow API usage"
   - Get your API Key and Secret Key from the API section

2. **Add Environment Variables**:
   Add these to your `.env` file:
   ```env
   # SMS/Phone Verification - İleti Merkezi API
   ILETI_MERKEZI_API_KEY="your-iletimerkezi-api-key"
   ILETI_MERKEZI_SECRET_KEY="your-iletimerkezi-secret-key"
   ILETI_MERKEZI_SENDER="RANDEVUBU"
   ILETI_MERKEZI_BASE_URL="https://api.iletimerkezi.com"
   ```

3. **Test the Integration**:
   ```bash
   # Check SMS service health
   curl -X GET http://localhost:3001/api/v1/auth/sms/health
   
   # Send test SMS
   curl -X POST http://localhost:3001/api/v1/auth/sms/test \
     -H "Content-Type: application/json" \
     -d '{
       "phoneNumber": "+905551234567",
       "message": "Test message from RandevuBu"
     }'
   ```

## Features Implemented

- **Phone Verification**: SMS codes for login and registration
- **Appointment Notifications**: Confirmation and reminder SMS
- **Payment Confirmations**: SMS for successful payments
- **Health Monitoring**: Check SMS service status and balance

## API Endpoints

- `POST /api/v1/auth/send-verification` - Send verification code
- `POST /api/v1/auth/verify-login` - Verify code and login
- `GET /api/v1/auth/sms/health` - Check SMS service health
- `POST /api/v1/auth/sms/test` - Send test SMS

## Development Mode

In development mode (`NODE_ENV=development`):
- SMS codes are logged to console instead of being sent
- Rate limits are relaxed for testing
- Cooldown periods are reduced
