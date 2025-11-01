# Contact Form Email Setup with AWS SES

## Overview

The contact form email feature has been successfully implemented using AWS SES (Simple Email Service). This setup allows your contact form to send emails to your business email address.

## AWS SES Free Tier

AWS SES offers a generous **free tier**:
- **62,000 emails per month** (for the first 12 months)
- After that: $0.10 per 1,000 emails
- **Completely free** for sending under 62,000 emails/month

## Setup Instructions

### 1. AWS SES Configuration

1. **Go to AWS SES Console**: https://console.aws.amazon.com/ses/
2. **Verify your email address** (or domain):
   - If using a single email: Add your email address and verify it
   - For production: Verify your domain (recommended)
3. **Create IAM user** with SES permissions (or use existing AWS credentials)

### 2. Environment Variables

Add these environment variables to your `.env` file:

```env
# AWS SES Configuration
AWS_REGION=us-east-1  # or your preferred region (e.g., eu-central-1)
AWS_SES_FROM_EMAIL=noreply@randevubu.com  # Verified sender email
AWS_SES_REPLY_EMAIL=info@randevubu.com  # Where replies go

# AWS Credentials (if not using IAM roles)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

### 3. Test the Contact Form

Once configured, the contact form endpoint is available at:

**POST** `/api/v1/contact`

**Request Body:**
```json
{
  "name": "Ahmet Yılmaz",
  "email": "ahmet@example.com",
  "phone": "05551234567",
  "subject": "Destek Talebi",
  "message": "Merhaba, randevu sisteminiz hakkında bilgi almak istiyorum."
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.",
  "data": {
    "messageId": "0100018e-1234-4567-abcd-123456789012-000000"
  }
}
```

## Features Implemented

✅ **AWS SES Email Service** - Professional email delivery
✅ **Beautiful HTML Email Templates** - Turkish interface with styled content
✅ **Rate Limiting** - 5 requests per 15 minutes per IP
✅ **Input Validation** - Comprehensive form validation with Turkish error messages
✅ **Error Handling** - Graceful error handling and logging
✅ **Swagger Documentation** - API documented in Swagger UI

## Email Template

The contact form sends a beautifully formatted HTML email with:
- Professional purple-themed design
- All form information clearly displayed
- Proper Turkish formatting
- Reply-to set to the sender's email

## Rate Limiting

The contact form has built-in rate limiting:
- **5 requests per 15 minutes** per IP address
- Prevents spam and abuse
- Automatic retry-after headers

## Security Features

- Input sanitization
- Email validation
- XSS protection via HTML escaping
- Request rate limiting
- Comprehensive error logging

## Moving Out of Sandbox Mode

By default, AWS SES starts in **sandbox mode** which only allows sending to verified email addresses. To send to any email address:

1. Request production access from AWS SES console
2. Fill out the use case form
3. Wait for approval (usually 24-48 hours)

**Sandbox mode is sufficient for development and testing!**

## Cost Analysis

For the contact form:
- Free tier: 62,000 emails/month = **$0.00/month**
- After free tier: ~$6/month for 60k emails
- **Extremely cost-effective** for a contact form

## Next Steps

1. Configure your AWS SES credentials
2. Test the endpoint with a sample request
3. Monitor the sent emails in your inbox
4. Adjust the email templates if needed in `src/lib/aws/email.ts`

## Troubleshooting

**Email not sending?**
- Check AWS credentials are correct
- Verify your email address in SES
- Check CloudWatch logs for SES errors
- Ensure you're not in sandbox mode (if sending to unverified addresses)

**Rate limit errors?**
- Wait 15 minutes between requests
- Or use different IP addresses for testing
