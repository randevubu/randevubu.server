/**
 * SMS Service Test Script
 * 
 * This script tests the NetGSM SMS service to diagnose issues.
 * Run with: npx ts-node scripts/test-sms-service.ts [phoneNumber]
 */

import { Netgsm } from '@netgsm/sms';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env';

console.log(`📁 Loading environment from: ${envFile}`);
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// Get environment variables
const username = process.env.NETGSM_USERNAME || '';
const password = process.env.NETGSM_PASSWORD || '';
const msgHeader = process.env.NETGSM_MSGHEADER || '';
const testPhone = process.argv[2] || process.env.TEST_PHONE_NUMBER || '';

// Mask sensitive data for logging
const maskString = (str: string, showFirst: number = 3, showLast: number = 2): string => {
  if (!str || str.length <= showFirst + showLast) return '***';
  return `${str.substring(0, showFirst)}${'*'.repeat(str.length - showFirst - showLast)}${str.slice(-showLast)}`;
};

console.log('\n🔍 SMS Service Test Script');
console.log('='.repeat(60));
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Environment file: ${envFile}`);
console.log('\n📋 Environment Variables Check:');
console.log(`  NETGSM_USERNAME: ${username ? maskString(username) : '❌ NOT SET'}`);
console.log(`  NETGSM_PASSWORD: ${password ? '***' : '❌ NOT SET'}`);
console.log(`  NETGSM_MSGHEADER: ${msgHeader || '❌ NOT SET'}`);
console.log(`  Test Phone: ${testPhone || '❌ NOT PROVIDED (pass as argument)'}`);

// Validation
if (!username || !password) {
  console.error('\n❌ ERROR: NETGSM_USERNAME and NETGSM_PASSWORD are required!');
  process.exit(1);
}

if (!msgHeader) {
  console.warn('\n⚠️  WARNING: NETGSM_MSGHEADER is not set!');
}

if (!testPhone) {
  console.error('\n❌ ERROR: Test phone number is required!');
  console.log('Usage: npx ts-node scripts/test-sms-service.ts +905551234567');
  process.exit(1);
}

// Normalize phone number (Turkish format)
function normalizePhoneNumber(phoneNumber: string): string | null {
  try {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');

    // Handle Turkish phone numbers - NetGSM expects format: 5xxxxxxxxx
    if (digits.startsWith('90')) {
      // Has country code, remove it and return the rest
      const withoutCountryCode = digits.substring(2);
      if (withoutCountryCode.startsWith('5') && withoutCountryCode.length === 10) {
        return withoutCountryCode;
      }
    } else if (digits.startsWith('0')) {
      // Remove leading 0
      const withoutZero = digits.substring(1);
      if (withoutZero.startsWith('5') && withoutZero.length === 10) {
        return withoutZero;
      }
    } else if (digits.startsWith('5') && digits.length === 10) {
      // Already in correct format
      return digits;
    }

    return null;
  } catch (error) {
    return null;
  }
}

const normalizedPhone = normalizePhoneNumber(testPhone);
if (!normalizedPhone) {
  console.error(`\n❌ ERROR: Invalid phone number format: ${testPhone}`);
  console.log('Expected format: +905551234567 or 05551234567 or 5551234567');
  process.exit(1);
}

console.log(`\n📱 Phone Number: ${testPhone} -> ${normalizedPhone} (normalized)`);

// Initialize NetGSM
console.log('\n🔧 Initializing NetGSM client...');
const netgsm = new Netgsm({
  username,
  password
});

// Test message
const testMessage = `RandevuBu test mesajıdır. Kod: 123456\n\nBu kod 10 dakika geçerlidir.`;

console.log(`\n📤 Sending test SMS...`);
console.log(`  To: ${normalizedPhone}`);
console.log(`  Message: ${testMessage.substring(0, 50)}...`);
console.log(`  Sender: ${msgHeader}`);

// Send SMS
(async () => {
  try {
    console.log('\n⏳ Calling NetGSM API...');
    const startTime = Date.now();
    
    const response = await netgsm.sendRestSms({
      msgheader: msgHeader,
      messages: [
        {
          msg: testMessage,
          no: normalizedPhone
        }
      ]
    });

    const duration = Date.now() - startTime;
    
    console.log(`\n✅ API Response received (${duration}ms):`);
    console.log(JSON.stringify(response, null, 2));

    // Check response
    if (response.code === '00') {
      console.log('\n🎉 SUCCESS! SMS sent successfully!');
      console.log(`  Job ID: ${response.jobid}`);
      console.log(`  Status: ${response.description || 'OK'}`);
    } else {
      console.log('\n❌ FAILED! NetGSM returned an error:');
      console.log(`  Code: ${response.code}`);
      console.log(`  Description: ${response.description || 'Unknown error'}`);
      console.log(`  Status: ${(response as any).status || 'N/A'}`);
      
      // Common error codes
      const errorCodes: Record<string, string> = {
        '30': 'Credential Error - Invalid username or password',
        '20': 'Message header (MSGHEADER) error',
        '40': 'Phone number format error',
        '50': 'Account balance insufficient',
        '51': 'Account not found',
        '70': 'Invalid message content',
      };
      
      if (response.code && errorCodes[response.code]) {
        console.log(`\n💡 Help: ${errorCodes[response.code]}`);
      }
    }

  } catch (error) {
    console.error('\n❌ EXCEPTION occurred while sending SMS:');
    
    if (error instanceof Error) {
      console.error(`  Error Type: ${error.constructor.name}`);
      console.error(`  Message: ${error.message}`);
      if (error.stack) {
        console.error(`  Stack:\n${error.stack}`);
      }
    } else if (typeof error === 'object' && error !== null) {
      console.error('  Error Object:');
      console.error(JSON.stringify(error, null, 2));
      
      // Check if it's a NetGSM error response
      const netgsmError = error as any;
      if (netgsmError.code === '30' || netgsmError.description === 'credentialError') {
        console.error('\n💡 This is a credential error. Please check:');
        console.error('  1. Username and password are correct');
        console.error('  2. Account is active in NetGSM panel');
        console.error('  3. API access is enabled for your account');
        console.error('  4. No special characters or spaces in credentials');
      }
    } else {
      console.error(`  Error: ${String(error)}`);
    }
    
    process.exit(1);
  }
})();




