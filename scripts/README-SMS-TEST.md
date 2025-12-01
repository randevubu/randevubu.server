# SMS Service Test Scripts

These scripts help diagnose NetGSM SMS service issues by testing the API directly.

## Quick Start

### Test in Development (Local)
```bash
npm run test:sms +905551234567
```

### Test in Production (Docker)
```bash
npm run test:sms:docker +905551234567
```

Or directly:
```bash
docker compose -f docker-compose.production.yml exec app1 node scripts/test-sms-service-simple.js +905551234567
```

## What the Scripts Do

1. **Check Environment Variables**
   - Verifies `NETGSM_USERNAME`, `NETGSM_PASSWORD`, and `NETGSM_MSGHEADER` are set
   - Shows masked values for security

2. **Normalize Phone Number**
   - Converts phone numbers to NetGSM format (5xxxxxxxxx)
   - Handles +90, 0, and direct formats

3. **Test NetGSM API**
   - Sends a test SMS directly via NetGSM API
   - Shows full API response
   - Provides detailed error messages

4. **Error Diagnosis**
   - Identifies common error codes
   - Provides helpful suggestions for fixing issues

## Common Error Codes

- **Code 30**: Credential Error - Invalid username/password
- **Code 20**: Message header (MSGHEADER) error
- **Code 40**: Phone number format error
- **Code 50**: Account balance insufficient
- **Code 51**: Account not found
- **Code 70**: Invalid message content

## Troubleshooting

### Credential Error (Code 30)
1. Verify credentials in NetGSM panel
2. Check if account is active
3. Ensure API access is enabled
4. Compare `.env` vs `.env.production` values
5. Check for extra spaces or special characters

### Environment Variables Not Loading
- Development: Check `.env` file exists
- Production: Check `.env.production` file exists
- Docker: Verify `env_file` in docker-compose.yml points to correct file

### Phone Number Format Error
- Use format: `+905551234567` or `05551234567` or `5551234567`
- Must be Turkish phone number starting with 5

## Files

- `test-sms-service.ts` - TypeScript version (requires ts-node)
- `test-sms-service-simple.js` - JavaScript version (runs directly with node)





