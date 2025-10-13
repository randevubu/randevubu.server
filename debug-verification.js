/**
 * Debug script to test phone verification
 * Run with: node debug-verification.js
 */

const { parsePhoneNumber } = require('libphonenumber-js');

// Test phone number normalization
function testPhoneNormalization(phoneNumber) {
  try {
    const parsed = parsePhoneNumber(phoneNumber);
    const e164 = parsed.format('E.164');
    console.log(`Input: ${phoneNumber}`);
    console.log(`E.164: ${e164}`);
    console.log(`Country: ${parsed.country}`);
    console.log('---');
    return e164;
  } catch (error) {
    console.error(`Failed to parse: ${phoneNumber}`, error.message);
    return null;
  }
}

console.log('=== Phone Number Normalization Test ===\n');

// Test various formats
const testNumbers = [
  '+905551234567',      // E.164 format
  '05551234567',        // Turkish local format
  '5551234567',         // Without leading 0
  '+90 555 123 45 67',  // Formatted
  '0555 123 45 67',     // With spaces
];

testNumbers.forEach(num => testPhoneNormalization(num));

console.log('\n=== Test Instructions ===');
console.log('1. Copy the phone number you used to REQUEST the verification code');
console.log('2. Copy the phone number you used to VERIFY the code');
console.log('3. Run this script with both numbers to see if they normalize to the same E.164 format');
