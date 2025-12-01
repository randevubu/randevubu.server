/**
 * Direct NetGSM API Test (without library)
 * Tests the API directly via HTTP to isolate the issue
 */

import * as https from 'https';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const username = process.env.NETGSM_USERNAME || '';
const password = process.env.NETGSM_PASSWORD || '';
const msgHeader = process.env.NETGSM_MSGHEADER || '';
const testPhone = process.argv[2] || '';

console.log(`\n📱 NetGSM Direct API Test`);
console.log(`Username: ${username ? username.substring(0, 3) + '***' : 'NOT SET'}`);
console.log(`Phone: ${testPhone}`);

if (!username || !password || !testPhone) {
  console.error('❌ Missing credentials or phone number');
  process.exit(1);
}

// Try different API endpoints
const endpoints = [
  {
    name: "Standard REST",
    url: "https://api.netgsm.com.tr/sms/send/rest",
    method: "POST",
    body: {
      username,
      password,
      msgheader: msgHeader,
      message: "Test",
      gsm1: testPhone
    }
  },
  {
    name: "Alternative REST",
    url: "https://api.netgsm.com.tr/v1/sms/send",
    method: "POST",
    body: {
      username,
      password,
      msgheader: msgHeader,
      message: "Test",
      gsm1: testPhone
    }
  },
  {
    name: "GET endpoint",
    url: `https://api.netgsm.com.tr/sms/send/?username=${username}&password=${password}&msgheader=${msgHeader}&message=Test&gsm1=${testPhone}`,
    method: "GET",
    body: null
  }
];

async function testEndpoint(endpoint: any): Promise<void> {
  return new Promise((resolve) => {
    console.log(`\n🔄 Testing: ${endpoint.name}`);
    console.log(`   URL: ${endpoint.url}`);

    const url = new URL(endpoint.url);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Response: ${data}`);
        
        try {
          const json = JSON.parse(data);
          if (json.code === '00') {
            console.log(`   ✅ SUCCESS!`);
          } else if (json.code === '30') {
            console.log(`   ❌ Credential Error (Code 30)`);
          } else {
            console.log(`   Code: ${json.code}, Description: ${json.description}`);
          }
        } catch (e) {
          // Not JSON
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.log(`   ❌ Error: ${error.message}`);
      resolve();
    });

    if (endpoint.body) {
      req.write(JSON.stringify(endpoint.body));
    }
    req.end();
  });
}

(async () => {
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log('\n✅ Testing complete');
})();
