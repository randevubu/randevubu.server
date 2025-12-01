# NetGSM SMS Service - Troubleshooting Guide

## Issue: "NetGSM Credential Error: Invalid username or password (Code: 30)"

This is the most common issue when using NetGSM with the `@netgsm/sms` library.

---

## Root Causes & Solutions

### 1. **Wrong Credentials** (Most Common)

**Symptoms:**
- Code 30 errors consistently
- Works in one environment but not another
- Suddenly stopped working after credentials change

**Solutions:**
1. **Verify credentials in NetGSM admin panel:**
   - Go to: https://netgsm.com.tr/
   - Login to your account
   - Navigate to API settings
   - Copy the exact username/password

2. **Check for hidden whitespace:**
   ```bash
   # In PowerShell - verify your .env credentials
   # Check if there are spaces before/after values
   $env:NETGSM_USERNAME | ForEach-Object { Write-Host "Length: $($_.Length), Value: '$_'" }
   ```

3. **Compare credentials:**
   - `.env` (development)
   - `.env.production` (production)
   - Sometimes they have different values

4. **Use the diagnostic script:**
   ```bash
   npx ts-node scripts/test-sms-diagnostic.ts +905551234567
   ```

---

### 2. **API Access Not Enabled**

**Symptoms:**
- Code 30 errors
- Credentials are definitely correct
- Works with different API tool but not this library

**Solutions:**
1. Login to NetGSM admin panel
2. Go to API/Integration settings
3. Verify "API Access" is enabled/active
4. Check if IP restrictions are applied
5. Reset/regenerate API keys if available

---

### 3. **Account Issues**

**Symptoms:**
- Code 30 errors
- Worked before but stopped

**Solutions:**
1. **Check account status:**
   - Account must be active/verified
   - No suspension or blocking

2. **Verify account credits:**
   - Your account must have SMS credits
   - Check account balance in panel
   - If balance is 0, you'll get Code 50 (insufficient balance)

3. **Verify email verification:**
   - NetGSM accounts must be email verified
   - Check your email for verification links

---

### 4. **MSGHEADER Configuration**

**Symptoms:**
- Code 20 errors (msgheader issue)
- SMS sends but with wrong sender name

**Solutions:**
1. **Check NETGSM_MSGHEADER value:**
   ```env
   # ✓ Correct examples:
   NETGSM_MSGHEADER=MyBusiness
   NETGSM_MSGHEADER=Support
   NETGSM_MSGHEADER=8503036315
   
   # ❌ Don't use these:
   NETGSM_MSGHEADER=                    (empty)
   NETGSM_MSGHEADER="8503036315"        (with quotes)
   NETGSM_MSGHEADER= 8503036315         (with leading space)
   ```

2. **Register sender name:**
   - Go to NetGSM admin panel
   - Register your business name as sender
   - Use the registered name in NETGSM_MSGHEADER

---

## How to Verify Your Setup

### Step 1: Use the Diagnostic Script

```bash
# Navigate to project directory
cd c:\Users\offic\OneDrive\Desktop\randevubu.server

# Run diagnostic (provide a test phone number)
npx ts-node scripts/test-sms-diagnostic.ts +905551234567
```

This script will:
- ✓ Check environment variables
- ✓ Detect whitespace issues
- ✓ Analyze credentials
- ✓ Test NetGSM API directly
- ✓ Provide specific error diagnosis

### Step 2: Test with cURL (Direct API)

If the library fails, test directly with the NetGSM REST API:

```powershell
# PowerShell example
$username = "8503036315"
$password = "Cihan.012034"
$phone = "5551234567"
$message = "Test message"
$sender = "8503036315"

$body = @{
    username = $username
    password = $password
    msgheader = $sender
    message = $message
    gsm1 = $phone
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "https://api.netgsm.com.tr/sms/send/rest" `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $body

$response.Content | ConvertFrom-Json
```

If this works but the library doesn't, there might be a library configuration issue.

### Step 3: Check .env File

```env
# Verify these are set and have no extra spaces:
NETGSM_USERNAME=8503036315
NETGSM_PASSWORD=Cihan.012034
NETGSM_MSGHEADER=8503036315
```

- No leading/trailing spaces
- No quotes around values
- Passwords with dots (.) are fine
- Numeric usernames are fine

---

## Common Error Codes Reference

| Code | Meaning | Solution |
|------|---------|----------|
| 00 | Success | SMS sent successfully ✓ |
| 20 | Msgheader Error | Check NETGSM_MSGHEADER configuration |
| 30 | Credential Error | Verify username/password in NetGSM panel |
| 40 | Invalid Phone | Check phone number format (5xxxxxxxxx) |
| 50 | Insufficient Balance | Add SMS credits to account |
| 51 | Account Not Found | Account doesn't exist or is blocked |
| 70 | Invalid Content | Message content not allowed |

---

## Debugging Logs

After making the improvements, your logs will show more diagnostic info:

```json
{
  "level": "error",
  "msg": "SMS Service: NetGSM API call failed",
  "error": "NetGSM Credential Error...",
  "credentialValidationIssues": [
    "Issue 1",
    "Issue 2"
  ],
  "credentialDetails": {
    "usernameSet": true,
    "passwordSet": true,
    "usernameLength": 10,
    "passwordLength": 12,
    "hasSpecialChars": true
  }
}
```

This helps identify the exact issue.

---

## Quick Checklist

- [ ] Credentials correct in NetGSM admin panel
- [ ] No leading/trailing spaces in .env
- [ ] API access enabled in NetGSM account
- [ ] Account is active and verified
- [ ] Account has SMS credits > 0
- [ ] NETGSM_MSGHEADER is set to a registered sender name
- [ ] Phone number format is correct (5xxxxxxxxx for Turkish)
- [ ] Running diagnostic script shows no issues

---

## Still Having Issues?

1. **Run the diagnostic script:**
   ```bash
   npx ts-node scripts/test-sms-diagnostic.ts +905551234567
   ```

2. **Check the logs:**
   - Look at `logs/app.log` or console output
   - Find entries with "NetGSM" to see what's being attempted

3. **Contact NetGSM Support:**
   - Provide error code (30 in your case)
   - Provide your account username
   - Ask them to verify API access is enabled

4. **Compare with Test Script:**
   - Run `npm run test:sms -- +905551234567`
   - Compare output with production errors
   - Look for differences in error responses

---

## Code Changes Made

Updated `src/services/domain/sms/smsService.ts` with:

1. **Credential Trimming:**
   - Automatically removes leading/trailing whitespace
   - Prevents hidden space issues

2. **Validation Method:**
   - `validateCredentials()` - checks for common issues
   - Provides detailed diagnostic information

3. **Enhanced Logging:**
   - Logs credential details when errors occur
   - Shows specific issues found during validation
   - Includes character analysis in debug logs

4. **Constructor Safety:**
   - Try-catch around NetGSM initialization
   - Better error messages during startup

---

## Next Steps

1. Run the diagnostic script
2. Review the output
3. Fix any identified issues
4. Test with the test script
5. If still failing, collect diagnostic output and contact support
