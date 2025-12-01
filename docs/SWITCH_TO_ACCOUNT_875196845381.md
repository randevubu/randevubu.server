# Switch to AWS Account 875196845381

## Steps to Complete Setup in This Account

### 1. Verify Your Email in SES

1. Go to SES console in account `875196845381`:
   https://console.aws.amazon.com/ses/v2/home?region=us-east-1#/verified-identities

2. Check if `officialcihan0248@gmail.com` is verified
   - If YES → Skip to step 2
   - If NO → Create and verify it

### 2. Create IAM User in This Account

1. Go to IAM Console: https://console.aws.amazon.com/iam/
2. Click **Users** → **Create user**
3. User name: `randevubu-user`
4. Click **Next**
5. Click **"Create policy"** (or use existing one)
6. Use this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3Permissions",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::randevubu-s3bucket",
        "arn:aws:s3:::randevubu-s3bucket/*"
      ]
    },
    {
      "Sid": "SESPermissions",
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

7. Attach this policy to `randevubu-user`

### 3. Create Access Keys

1. In IAM → Users → `randevubu-user`
2. Go to **Security credentials** tab
3. Click **"Create access key"**
4. Save the **Access key ID** and **Secret access key**

### 4. Update Your Environment Variables

Update your `.env` file with the new credentials from account `875196845381`:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-new-access-key-from-account-875196845381>
AWS_SECRET_ACCESS_KEY=<your-new-secret-key-from-account-875196845381>

AWS_SES_FROM_EMAIL=officialcihan0248@gmail.com
AWS_SES_REPLY_EMAIL=officialcihan0248@gmail.com
```

### 5. Create SES Identity Authorization Policy

1. Go to SES console: https://console.aws.amazon.com/ses/v2/home?region=us-east-1#/verified-identities/officialcihan0248@gmail.com
2. Click **Authorization** tab
3. Click **Create policy**
4. Use this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::875196845381:user/randevubu-user"
      },
      "Action": "ses:SendEmail",
      "Resource": "arn:aws:ses:us-east-1:875196845381:identity/officialcihan0248@gmail.com"
    }
  ]
}
```

### 6. Restart Docker Container

```bash
docker-compose -f docker-compose.dev.yml restart app
```

### 7. Test the Contact Form

Submit a test message and it should work!

## Summary

- ✅ Verify email in account `875196845381`
- ✅ Create IAM user `randevubu-user` in account `875196845381`
- ✅ Add SES permissions to IAM user
- ✅ Create access keys
- ✅ Update `.env` with new credentials
- ✅ Create SES identity authorization policy
- ✅ Restart container
- ✅ Test contact form

















