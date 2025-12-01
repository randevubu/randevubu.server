/**
 * Test NetGSM API using the EXACT format from official documentation
 * This matches the PHP example provided by NetGSM
 */

import * as dotenv from 'dotenv';
import * as https from 'https';

dotenv.config({ path: '.env' });

const username = (process.env.NETGSM_USERNAME || '').trim();
const password = (process.env.NETGSM_PASSWORD || '').trim();
const msgheader = (process.env.NETGSM_MSGHEADER || '').trim();
const testPhone = process.argv[2] || '5466604336';

console.log('\n📱 NetGSM Official Format Test');
console.log('='.repeat(70));
console.log('\nCredentials:');
console.log(`  Username: ${username ? username.substring(0, 3) + '***' + username.slice(-2) : 'NOT SET'}`);
console.log(`  Password: ${'*'.repeat(password.length)}`);
console.log(`  MsgHeader: ${msgheader}`);
console.log(`  Test Phone: ${testPhone}`);

if (!username || !password || !msgheader) {
  console.error('\n❌ Missing credentials');
  process.exit(1);
}

// Create the data payload exactly as in NetGSM documentation
const data = {
  msgheader: msgheader,
  messages: [
    {
      msg: `NetGSM Test - ${new Date().toISOString()}`,
      no: testPhone
    }
  ],
  encoding: 'TR',
  iysfilter: '',
  partnercode: ''
};

// Create Basic Auth header exactly as in documentation
const authString = Buffer.from(`${username}:${password}`).toString('base64');

console.log('\n📤 Request Details:');
console.log(`  Endpoint: https://api.netgsm.com.tr/sms/rest/v2/send`);
console.log(`  Method: POST`);
console.log(`  Auth Header: Basic ${authString.substring(0, 10)}...`);
console.log(`  Body:`, JSON.stringify(data, null, 2));

const postData = JSON.stringify(data);

const options = {
  hostname: 'api.netgsm.com.tr',
  port: 443,
  path: '/sms/rest/v2/send',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${authString}`,
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('\n🔄 Sending request...\n');

const req = https.request(options, (res) => {
  let responseData = '';

  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers:`, JSON.stringify(res.headers, null, 2));

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('\n📥 Response Body:');
    console.log(responseData);

    try {
      const jsonResponse = JSON.parse(responseData);
      console.log('\n📊 Parsed Response:');
      console.log(JSON.stringify(jsonResponse, null, 2));

      if (jsonResponse.code === '00') {
        console.log('\n✅ SUCCESS! SMS sent successfully!');
        console.log(`   Job ID: ${jsonResponse.jobid}`);
        console.log(`   Description: ${jsonResponse.description}`);
      } else if (jsonResponse.code === '30') {
        console.log('\n❌ ERROR CODE 30: Credential Error');
        console.log('\n🔍 Diagnosis:');
        console.log('   This error means one of the following:');
        console.log('   1. Username (NETGSM_USERNAME) is incorrect');
        console.log('   2. Password (NETGSM_PASSWORD) is incorrect');
        console.log('   3. API access is not enabled for your account');
        console.log('\n💡 Action Required:');
        console.log('   - Verify credentials in NetGSM panel (https://www.netgsm.com.tr)');
        console.log('   - Check if you need to use "usercode" instead of "username"');
        console.log('   - Ensure API access is enabled in account settings');
        console.log('   - Contact NetGSM support to verify API access');
      } else if (jsonResponse.code === '40') {
        console.log('\n❌ ERROR CODE 40: Invalid Message Header');
        console.log(`   The msgheader "${msgheader}" is not registered in your account`);
      } else {
        console.log(`\n❌ ERROR CODE ${jsonResponse.code}`);
        console.log(`   Description: ${jsonResponse.description || 'Unknown error'}`);
      }
    } catch (e) {
      console.log('\n⚠️ Response is not valid JSON');
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Request Error:', error.message);
  console.error('Stack:', error.stack);
});

// Write the data to the request
req.write(postData);
req.end();
