/**
 * Advanced SMS Service Diagnostic Script
 * 
 * This script performs comprehensive diagnosis of NetGSM integration
 * Run with: npx ts-node scripts/test-sms-diagnostic.ts [phoneNumber]
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

// Get environment variables (WITH raw values for debugging)
const rawUsername = process.env.NETGSM_USERNAME || '';
const rawPassword = process.env.NETGSM_PASSWORD || '';
const msgHeader = process.env.NETGSM_MSGHEADER || '';

// Trim credentials
const username = rawUsername.trim();
const password = rawPassword.trim();

const testPhone = process.argv[2] || process.env.TEST_PHONE_NUMBER || '';

// Mask sensitive data for logging
const maskString = (str: string, showFirst: number = 3, showLast: number = 2): string => {
  if (!str || str.length <= showFirst + showLast) return '***';
  return `${str.substring(0, showFirst)}${'*'.repeat(str.length - showFirst - showLast)}${str.slice(-showLast)}`;
};

console.log('\n' + '='.repeat(70));
console.log('🔍 Advanced SMS Service Diagnostic');
console.log('='.repeat(70));

console.log('\n📋 STEP 1: Environment Variables Check');
console.log('-'.repeat(70));

// Raw values check
console.log('\n  Raw Environment Values (with potential whitespace):');
console.log(`    NETGSM_USERNAME: "${rawUsername}" (length: ${rawUsername.length})`);
console.log(`    NETGSM_PASSWORD: "${rawPassword}" (length: ${rawPassword.length})`);
console.log(`    NETGSM_MSGHEADER: "${msgHeader}" (length: ${msgHeader.length})`);

// Trimmed values check
console.log('\n  Trimmed Values (what will be used):');
console.log(`    username: "${username}" (length: ${username.length})`);
console.log(`    password: "${password}" (length: ${password.length})`);
console.log(`    msgHeader: "${msgHeader.trim()}" (length: ${msgHeader.trim().length})`);

// Whitespace detection
console.log('\n  Whitespace Detection:');
const usernameTrimmed = rawUsername !== username;
const passwordTrimmed = rawPassword !== password;
const msgHeaderTrimmed = msgHeader !== msgHeader.trim();

console.log(`    Username had leading/trailing whitespace: ${usernameTrimmed ? '⚠️ YES' : '✓ NO'}`);
console.log(`    Password had leading/trailing whitespace: ${passwordTrimmed ? '⚠️ YES' : '✓ NO'}`);
console.log(`    MsgHeader had leading/trailing whitespace: ${msgHeaderTrimmed ? '⚠️ YES' : '✓ NO'}`);

// Character analysis
console.log('\n  Character Analysis:');
console.log(`    Username starts with: "${username.charAt(0)}" (code: ${username.charCodeAt(0)})`);
console.log(`    Username ends with: "${username.charAt(username.length - 1)}" (code: ${username.charCodeAt(username.length - 1)})`);
console.log(`    Password starts with: "${password.charAt(0)}" (code: ${password.charCodeAt(0)})`);
console.log(`    Password ends with: "${password.charAt(password.length - 1)}" (code: ${password.charCodeAt(password.length - 1)})`);

// Special characters check
const specialCharsPattern = /[^a-zA-Z0-9._\-]/;
const usernameHasSpecialChars = specialCharsPattern.test(username);
const passwordHasSpecialChars = specialCharsPattern.test(password);

console.log('\n  Special Characters:');
console.log(`    Username contains special chars: ${usernameHasSpecialChars ? '⚠️ YES' : '✓ NO'}`);
console.log(`    Password contains special chars: ${passwordHasSpecialChars ? '⚠️ YES' : '✓ NO'}`);

// Validation
console.log('\n  Validation:');
const issues: string[] = [];

if (!username) {
  issues.push('❌ NETGSM_USERNAME is empty');
} else if (username.length < 3) {
  issues.push('⚠️ NETGSM_USERNAME is very short (less than 3 chars)');
}

if (!password) {
  issues.push('❌ NETGSM_PASSWORD is empty');
} else if (password.length < 6) {
  issues.push('⚠️ NETGSM_PASSWORD is very short (less than 6 chars)');
}

if (!msgHeader.trim()) {
  issues.push('⚠️ NETGSM_MSGHEADER is not set (might work without it)');
}

if (issues.length > 0) {
  console.log('  Issues found:');
  issues.forEach(issue => console.log(`    ${issue}`));
} else {
  console.log('    ✓ All environment variables appear valid');
}

// Phone number handling
console.log('\n📋 STEP 2: Phone Number Processing');
console.log('-'.repeat(70));

function normalizePhoneNumber(phoneNumber: string): string | null {
  try {
    const digits = phoneNumber.replace(/\D/g, "");

    if (digits.startsWith("90")) {
      const withoutCountryCode = digits.substring(2);
      if (withoutCountryCode.startsWith("5") && withoutCountryCode.length === 10) {
        return withoutCountryCode;
      }
    } else if (digits.startsWith("0")) {
      const withoutZero = digits.substring(1);
      if (withoutZero.startsWith("5") && withoutZero.length === 10) {
        return withoutZero;
      }
    } else if (digits.startsWith("5") && digits.length === 10) {
      return digits;
    }

    return null;
  } catch (error) {
    return null;
  }
}

if (!testPhone) {
  console.log(`  ⚠️ No test phone number provided`);
  console.log(`  Usage: npx ts-node scripts/test-sms-diagnostic.ts +905551234567`);
} else {
  const normalizedPhone = normalizePhoneNumber(testPhone);
  if (normalizedPhone) {
    console.log(`  ✓ Phone number normalized successfully`);
    console.log(`    Original: ${testPhone}`);
    console.log(`    Normalized: ${normalizedPhone}`);
  } else {
    console.log(`  ❌ Phone number normalization failed`);
    console.log(`    Provided: ${testPhone}`);
    console.log(`    Expected format: +905551234567 or 05551234567 or 5551234567`);
  }
}

// Library check
console.log('\n📋 STEP 3: NetGSM Library Check');
console.log('-'.repeat(70));

try {
  console.log(`  Initializing NetGSM client with credentials...`);
  const netgsm = new Netgsm({
    username,
    password
  });
  console.log(`  ✓ NetGSM client initialized successfully`);
  console.log(`    (Note: This only checks if object can be created, not if credentials are valid)`);
} catch (error) {
  console.log(`  ❌ Failed to initialize NetGSM client`);
  console.log(`    Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

// API Test (if phone provided)
if (testPhone && username && password && msgHeader) {
  console.log('\n📋 STEP 4: NetGSM API Test');
  console.log('-'.repeat(70));

  (async () => {
    try {
      const normalizedPhone = normalizePhoneNumber(testPhone);
      if (!normalizedPhone) {
        console.log('❌ Skipping API test: Invalid phone number');
        process.exit(1);
      }

      const netgsm = new Netgsm({
        username,
        password
      });

      const testMessage = `RandevuBu SMS Diagnostic Test - ${new Date().toISOString()}`;

      console.log(`\n  Calling NetGSM API...`);
      console.log(`    To: ${normalizedPhone}`);
      console.log(`    Message length: ${testMessage.length}`);
      console.log(`    Sender (MSGHEADER): ${msgHeader}`);
      console.log(`    Username: ${maskString(username)}`);
      console.log(`    Password: ***`);

      const startTime = Date.now();
      
      const response = await netgsm.sendRestSms({
        msgheader: msgHeader,
        encoding: 'TR',  // Turkish character support
        messages: [
          {
            msg: testMessage,
            no: normalizedPhone
          }
        ]
      });

      const duration = Date.now() - startTime;

      console.log(`\n  ✅ API Response received (${duration}ms):`);
      console.log(JSON.stringify(response, null, 2));

      if (response.code === '00') {
        console.log('\n🎉 SUCCESS! SMS was sent successfully!');
        console.log(`    Job ID: ${response.jobid}`);
      } else {
        console.log('\n❌ NetGSM returned an error:');
        console.log(`    Code: ${response.code}`);
        console.log(`    Description: ${response.description || 'Unknown'}`);

        const errorCodes: Record<string, string> = {
          '30': '❌ CREDENTIAL ERROR - Invalid username or password. This is the most common issue.',
          '20': '❌ MESSAGE HEADER ERROR - Check NETGSM_MSGHEADER configuration',
          '40': '❌ PHONE NUMBER FORMAT ERROR - Phone number format is invalid',
          '50': '❌ INSUFFICIENT BALANCE - Your account doesn\'t have enough SMS credits',
          '51': '❌ ACCOUNT NOT FOUND - The account doesn\'t exist',
          '70': '❌ INVALID MESSAGE CONTENT - Message content is invalid',
        };

        if (response.code && errorCodes[response.code]) {
          console.log(`\n  💡 Error Details:\n    ${errorCodes[response.code]}`);
        }

        // If credential error, show diagnostic info
        if (response.code === '30') {
          console.log('\n  🔍 Credential Error Diagnostics:');
          console.log(`     1. Username used: ${maskString(username)}`);
          console.log(`     2. Password length: ${password.length} characters`);
          console.log(`     3. Check NetGSM admin panel - verify credentials are active`);
          console.log(`     4. Verify API access is enabled for your account`);
          console.log(`     5. Check if credentials have leading/trailing spaces`);
          console.log(`     6. Ensure username and password match between .env files`);
        }
      }
    } catch (error) {
      console.log('\n❌ EXCEPTION occurred:');

      if (error instanceof Error) {
        console.log(`    Type: ${error.constructor.name}`);
        console.log(`    Message: ${error.message}`);
        if (error.stack) {
          console.log(`    Stack trace:\n${error.stack}`);
        }
      } else if (typeof error === 'object') {
        console.log('    Error object:');
        console.log(JSON.stringify(error, null, 2));

        if (typeof error === 'object' && error !== null) {
          const err = error as any;
          if (err.code === '30' || err.description === 'credentialError') {
            console.log('\n  🔍 This appears to be a credential error.');
            console.log('     Please verify:');
            console.log('     - Username and password are correct in .env');
            console.log('     - No extra spaces before/after credentials');
            console.log('     - Account is active in NetGSM panel');
            console.log('     - API access is enabled');
          }
        }
      } else {
        console.log(`    Error: ${String(error)}`);
      }
      
      process.exit(1);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Diagnostic complete');
    console.log('='.repeat(70));
  })();
} else {
  console.log('\n⚠️ Skipping API test - provide test phone number to continue');
  console.log('   Usage: npx ts-node scripts/test-sms-diagnostic.ts +905551234567');
  console.log('\n' + '='.repeat(70));
}
