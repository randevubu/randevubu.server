# NetGSM SMS Service - Quick Fix Guide

## Problem
You're getting: `NetGSM Credential Error (Code 30): Invalid username or password`

## Solution - 3 Simple Steps

### Step 1: Run Diagnostic Tool ⚡
```bash
# Open PowerShell in your project directory
cd c:\Users\offic\OneDrive\Desktop\randevubu.server

# Run diagnostic (replace phone number with your test number)
npm run test:sms:diagnostic -- +905551234567
```

### Step 2: Check the Results 🔍
Look at the output and look for:

**✓ GREEN (Good):**
```
✓ NETGSM_USERNAME: 850***5
✓ NETGSM_PASSWORD: ***
✓ NETGSM_MSGHEADER: 850***5
✓ Whitespace Detection: ✓ NO
✓ API Response received
✓ SUCCESS! SMS was sent successfully!
```

**❌ RED (Problem):**
```
❌ NETGSM_USERNAME is empty
❌ NETGSM_PASSWORD is empty  
❌ Code 30: Credential Error
❌ Username had leading/trailing whitespace: ⚠️ YES
```

### Step 3: Fix Based on Results 🛠️

| What the Diagnostic Shows | What to Do |
|---|---|
| Whitespace detected | Edit `.env`, remove spaces from credentials |
| All green but still fails in app | Compare `.env` vs `.env.production` - they might differ |
| Code 30 error in diagnostic | Verify credentials in NetGSM admin panel |
| Different values in `.env` vs `.env.production` | Update production file with correct credentials |
| ✓ Diagnostic passes but app still fails | Check Docker env variables or restart app |

---

## Common Fixes

### Fix #1: Remove Hidden Spaces (Most Common)
```env
# ❌ WRONG (has trailing space)
NETGSM_PASSWORD=Cihan.012034 

# ✓ CORRECT
NETGSM_PASSWORD=Cihan.012034
```

**How to check:**
1. Open `.env` in VS Code
2. Click at end of `NETGSM_PASSWORD` value
3. Press `End` key to go to real end
4. If cursor moves, there's a space - delete it

### Fix #2: Verify NetGSM Credentials
1. Go to https://netgsm.com.tr/
2. Login to your account
3. Go to API/Integration settings
4. Copy username and password exactly
5. Update `.env`:
```env
NETGSM_USERNAME=8503036315
NETGSM_PASSWORD=Cihan.012034
NETGSM_MSGHEADER=8503036315
```

### Fix #3: Sync Dev and Production
Compare your files:
- `.env` (development)
- `.env.production` (if exists)

They should have same NetGSM credentials:
```bash
# In PowerShell
Get-Content .env | Select-String "NETGSM"
Get-Content .env.production | Select-String "NETGSM"
```

### Fix #4: Restart Application
After fixing `.env`:
```bash
# If running locally
# Press Ctrl+C to stop
# Then restart
npm run dev

# If running in Docker
docker-compose restart randevubu-dev
# or rebuild
docker-compose -f docker-compose.dev.yml up --build
```

---

## Full Verification Flow

```bash
# 1. Run diagnostic first
npm run test:sms:diagnostic -- +905551234567

# 2. If diagnostic shows issues, fix them

# 3. Re-run diagnostic to confirm fix
npm run test:sms:diagnostic -- +905551234567

# 4. If diagnostic passes, run the original test
npm run test:sms -- +905551234567

# 5. If still failing, restart app
npm run dev
# Then try step 4 again
```

---

## What Was Fixed

Your code now has:

✅ **Automatic whitespace trimming** - No hidden space errors
✅ **Better error messages** - Shows exactly what's wrong  
✅ **Diagnostic script** - Tests your setup completely
✅ **Credential validation** - Checks for common issues
✅ **Detailed logging** - Helps identify problems

---

## Still Not Working?

1. **Collect this information:**
   ```bash
   npm run test:sms:diagnostic -- +905551234567 > output.txt 2>&1
   ```

2. **Check the logs:**
   ```bash
   # Look for NetGSM errors
   tail -n 100 logs/app.log
   ```

3. **Verify NetGSM account:**
   - Account is active (not suspended)
   - API access is enabled
   - Has SMS credits
   - Email is verified

4. **Contact support with:**
   - Output from diagnostic script
   - Your NetGSM username (not password)
   - When it started happening
   - Which environment (dev/production)

---

## Important Notes

⚠️ **For Docker users:**
- If using Docker, restart the container after `.env` changes
- Or rebuild: `docker-compose -f docker-compose.dev.yml up --build`

⚠️ **For Production:**
- Make sure `.env.production` also has correct credentials
- They can be different from development

⚠️ **Credentials:**
- Username `8503036315` is your NetGSM account number
- Password should be your API password (with the dot)
- MSGHEADER should be your sender name or account number

---

## Testing Process

```
Start Here: npm run test:sms:diagnostic -- +905551234567
    ↓
    Does it show ✓ SUCCESS?
    ↓
    YES → Fix any issues shown, try again
    ↓
    NO → App should work now, restart it
    ↓
    npm run dev (or docker-compose restart)
    ↓
    Try SMS verification in app
    ↓
    Done!
```

---

## Files to Check

These files were updated/created:

1. **src/services/domain/sms/smsService.ts** - Enhanced with credential trimming
2. **scripts/test-sms-diagnostic.ts** - New diagnostic tool
3. **docs/NETGSM_TROUBLESHOOTING.md** - Detailed troubleshooting guide
4. **SMS_SERVICE_FIX_SUMMARY.md** - Complete analysis

---

## Quick Commands

```bash
# Run diagnostic
npm run test:sms:diagnostic -- +905551234567

# Run original test
npm run test:sms -- +905551234567

# Restart app
npm run dev

# Check logs
tail -f logs/app.log

# Search logs for NetGSM
Get-Content logs/app.log | Select-String -Pattern "NetGSM|SMS Service"
```

---

**Good luck! The diagnostic tool will show you exactly what's wrong.** 🚀
