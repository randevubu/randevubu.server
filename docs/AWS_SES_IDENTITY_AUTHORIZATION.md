# AWS SES Identity Authorization - IAM User Setup

## The Problem

Even with correct IAM permissions, you may see this error:
```
User 'arn:aws:iam::...:user/randevubu-user' is not authorized to perform 'ses:SendEmail' on resource 'arn:aws:ses:us-east-1:...:identity/officialcihan0248@gmail.com'
```

## Why This Happens

In AWS SES, identities (email addresses/domains) have their own authorization settings. You need to explicitly authorize which IAM users/roles can send FROM that identity.

## Solution: Enable Identity Policy

You need to authorize your IAM user to send from the verified identity.

### Option 1: Via AWS Console (Easiest)

1. Go to AWS SES Console: https://console.aws.amazon.com/ses/
2. Click **Identities** in the left sidebar
3. Click on your verified identity: `officialcihan0248@gmail.com`
4. Scroll down to **"Identity policy"** section
5. Click **"Edit identity policy"**
6. Add this policy:

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
      "Resource": "*"
    }
  ]
}
```

7. Save changes

### Option 2: More Restrictive (Better Security)

If you want to be more specific:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::355202574911:user/randevubu-user"
      },
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "arn:aws:ses:us-east-1:355202574911:identity/officialcihan0248@gmail.com"
    }
  ]
}
```

### Alternative: Remove Restrictions (Less Secure)

1. In the identity settings
2. Find **"Sending authorization"** section
3. Look for any restrictions
4. Remove them or set to "Allow all"

## Step-by-Step in AWS Console

### Find the Identity Authorization Section

1. Go to: https://console.aws.amazon.com/ses/home?region=us-east-1#/identities
2. Click on: `officialcihan0248@gmail.com`
3. Look for these sections:
   - **"Sending authorization"**
   - **"Identity policy"**
   - **"From authorization"**

### Add Authorization

**If you see a section like "Other users and roles who can send on behalf of this identity":**
1. Click **"Add authorization"** or **"Edit"**
2. Enter your IAM user ARN: `arn:aws:iam::355202574911:user/randevubu-user`
3. Select permissions: `SendEmail`
4. Save

## Verify Your IAM Policy (Already Correct ✅)

Your IAM policy should have:
```json
{
  "Sid": "AllowSES",
  "Effect": "Allow",
  "Action": [
    "ses:SendEmail",
    "ses:SendRawEmail"
  ],
  "Resource": "*"
}
```

This is already correct in your policy.

## Test After Changes

After adding identity authorization, test your contact form again. The email should now send successfully.

## Visual Guide to Find the Setting

The exact location varies by AWS console UI version:
- Usually under the identity details page
- Look for tabs like "Permissions", "Authorization", or "Access"
- Common sections: "Sending authorization", "Identity policy", "Access control"

## Troubleshooting

### Still Not Working?

1. Wait 1-2 minutes for changes to propagate
2. Double-check the IAM user ARN is correct
3. Make sure the identity shows as "Verified"
4. Check you're in the correct AWS region (us-east-1)

### Alternative: Use SES Sending Authorization API

You can also use AWS CLI:
```bash
aws ses put-identity-policy \
  --identity officialcihan0248@gmail.com \
  --policy-name AllowSendFromRandevubuUser \
  --policy file://policy.json
```

Where `policy.json` contains:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"AWS": "arn:aws:iam::355202574911:user/randevubu-user"},
    "Action": "ses:SendEmail",
    "Resource": "*"
  }]
}
```














