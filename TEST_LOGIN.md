# Test Login Instructions

## 🎯 Overview
After running the seed script, you'll have 4 sample businesses with real phone numbers that you can use to test the login functionality.

## 🔑 Available Test Accounts

### 1. Elite Hair Salon
- **Phone Number**: `+905551234567`
- **Owner**: Ayşe Yılmaz
- **Business Type**: Hair Salon
- **Plan**: Professional
- **Location**: Istanbul, Kadıköy

### 2. Modern Barber Shop
- **Phone Number**: `+905552345678`
- **Owner**: Mehmet Demir
- **Business Type**: Barber Shop
- **Plan**: Starter
- **Location**: Istanbul, Beyoğlu

### 3. Wellness Spa Center
- **Phone Number**: `+905553456789`
- **Owner**: Zeynep Kaya
- **Business Type**: Spa & Wellness
- **Plan**: Business
- **Location**: Izmir, Çeşme

### 4. Dental Care Clinic
- **Phone Number**: `+905554567890`
- **Owner**: Dr. Ahmet Özkan
- **Business Type**: Dental Clinic
- **Plan**: Professional
- **Location**: Ankara, Çankaya

## 🚀 How to Test Login

### Step 1: Send Verification Code
```bash
POST /api/v1/auth/send-verification
Content-Type: application/json

{
  "phoneNumber": "+905551234567",
  "purpose": "REGISTRATION"
}
```

### Step 2: Verify and Login
```bash
POST /api/v1/auth/verify-login
Content-Type: application/json

{
  "phoneNumber": "+905551234567",
  "verificationCode": "123456"  # Use the code you received
}
```

## 📱 Testing with Different Phone Numbers

You can test with any of the 4 phone numbers above. Each will give you access to a different business with different subscription plans and permissions.

## 🔍 What You'll Get After Login

- **Access Token**: For API calls
- **User Profile**: Business owner information
- **Business Access**: Full access to manage the business
- **Role**: OWNER role with business management permissions

## ⚠️ Important Notes

1. **Verification Required**: You need to send verification codes to these numbers first
2. **Real Phone Numbers**: These are Turkish phone numbers (+90)
3. **Business Context**: Each login gives you access to a specific business
4. **Owner Permissions**: Full business management capabilities

## 🧪 Testing Scenarios

1. **Login as Different Business Owners**: Test different business types and subscription levels
2. **Business Management**: Test business CRUD operations
3. **Service Management**: Test adding/editing services
4. **Appointment Management**: Test appointment booking system
5. **Staff Management**: Test adding staff members

## 🔧 Development Tips

- Use Postman or similar tools to test the API endpoints
- Check the response headers for authentication cookies
- Monitor the server logs for detailed authentication flow
- Test both successful and failed login attempts
