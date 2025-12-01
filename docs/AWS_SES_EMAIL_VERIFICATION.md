# AWS SES Email Verification Guide

## Why You Need to Verify Email Addresses

AWS SES has a **sandbox mode** by default. In sandbox mode, you can only send emails to verified email addresses. This is a security measure to prevent spam.

## How to Verify Your Email in AWS SES

### Step 1: Go to AWS SES Console
1. Open: https://console.aws.amazon.com/ses/
2. Make sure you're in the correct region (e.g., `us-east-1`)

### Step 2: Verify Email Address
1. Click **Verified identities** in the left sidebar
2. Click **Create identity** button
3. Select **Email address**
4. Enter your email: `noreply@randevubu.com` (or whatever email you set in `AWS_SES_FROM_EMAIL`)
5. Click **Create identity**

### Step 3: Check Your Email
1. AWS will send a verification email
2. Open your email inbox
3. Click the verification link in the email
4. You'll see a success message: "Email address verified"

## Production Mode (Recommended for Production)

### Request Production Access
For production use, you need to request to move out of sandbox mode:

1. In SES Console → **Account dashboard**
2. Click **Request production access**
3. Fill out the form:
   - **Use case**: Select "Transactional emails" or "Customer service emails"
   - **Website URL**: Your website URL
   - **Mail type**: Select what you're sending
4. Submit request (usually approved within 24 hours)

### Or: Verify Your Domain (Better Option)
Instead of verifying individual emails, verify your entire domain:

1. In SES Console → **Verified identities** → **Create identity**
2. Select **Domain**
3. Enter your domain: `randevubu.com`
4. Follow the DNS verification steps
5. Add the required DNS records to your domain

This allows you to send from any email address on your domain (e.g., noreply@, info@, support@, etc.)

## Quick Checklist

- [ ] Email `noreply@randevubu.com` is verified in SES
- [ ] Email `info@randevubu.com` (reply-to) is verified (if different)
- [ ] Your IAM policy has SES permissions (already done ✅)
- [ ] Environment variables are set correctly in `.env`

## After Verification

Once your email is verified, your contact form should work! Test it by submitting the form.

## Common Issues

### "Email address not verified"
**Solution:** Make sure you clicked the verification link in the email AWS sent

### "Message rejected" 
**Solution:** 
1. Check AWS SES Console → Suppression list
2. Make sure you're not in sandbox mode (or recipient is verified)
3. Check AWS CloudWatch logs for detailed error

### Already Verified But Still Not Working?
**Solution:** Wait a few minutes - verification can take 1-2 minutes to propagate

## Environment Variables

Make sure these are set in your `.env`:
```env
AWS_REGION=us-east-1
AWS_SES_FROM_EMAIL=noreply@randevubu.com  # This email MUST be verified
AWS_SES_REPLY_EMAIL=info@randevubu.com    # This email should also be verified
```

















