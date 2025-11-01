# Troubleshooting AWS SES Permissions

## The Problem

You're getting:
```
User 'arn:aws:iam::355202574911:user/randevubu-user' is not authorized to perform 'ses:SendEmail' on resource 'arn:aws:ses:us-east-1:355202574911:identity/officialcihan0248@gmail.com'
```

## Quick Diagnosis

**The resource ARN in the error uses account ID `355202574911`**, but you may have been looking at an identity in a different account (`875196845381`).

## Solution Steps

### Step 1: Switch to the Correct AWS Account

Make sure you're in the AWS account where your IAM user `randevubu-user` exists.

1. Check your current AWS account (top right of AWS console)
2. If it shows `875196845381`, switch to account `355202574911` where your IAM user is
3. Go to SES console in that account

### Step 2: Find/Verify the Email Identity

Go to SES console in account `355202574911`:
https://console.aws.amazon.com/ses/v2/home?region=us-east-1#/verified-identities

Look for `officialcihan0248@gmail.com`

**If it doesn't exist there**, you need to:
1. Verify the email in the correct account (`355202574911`)
2. Create the authorization policy in that account

### Step 3: Create the Authorization Policy

Once you're in the correct account and found the identity:

1. Go to: https://console.aws.amazon.com/ses/v2/home?region=us-east-1#/verified-identities/officialcihan0248@gmail.com
2. Click **"Authorization"** tab
3. Click **"Create policy"**
4. Use this policy (with the account ID from the error - `355202574911`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::355202574911:user/randevubu-user"
      },
      "Action": "ses:SendEmail",
      "Resource": "arn:aws:ses:us-east-1:355202574911:identity/officialcihan0248@gmail.com"
    }
  ]
}
```

### Step 4: Verify Your IAM User Has SES Permissions

In account `355202574911`:
1. Go to IAM → Users → `randevubu-user`
2. Check the attached policies have:
   ```json
   {
     "Effect": "Allow",
     "Action": ["ses:SendEmail", "ses:SendRawEmail"],
     "Resource": "*"
   }
   ```

### Step 5: Check Your Environment Variables

Make sure your `.env` has:
```env
AWS_REGION=us-east-1
AWS_SES_FROM_EMAIL=officialcihan0248@gmail.com
AWS_SES_REPLY_EMAIL=officialcihan0248@gmail.com
```

And your AWS credentials are from account `355202574911` (where `randevubu-user` exists).

### Step 6: Restart Docker Container

After making changes, restart:
```bash
docker-compose -f docker-compose.dev.yml restart app
```

## Alternative: Use Verified Email from Current Account

If you can't access account `355202574911`, you can:

1. Verify `officialcihan0248@gmail.com` in account `355202574911` where your IAM user is
2. Create the authorization policy there
3. Update your `.env` to point to that identity







