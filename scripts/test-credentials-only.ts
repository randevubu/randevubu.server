/**
 * Simple credential verification test
 * Tests if credentials can authenticate with NetGSM without sending SMS
 */

import { Netgsm } from '@netgsm/sms';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const username = (process.env.NETGSM_USERNAME || '').trim();
const password = (process.env.NETGSM_PASSWORD || '').trim();

console.log('\n🔐 Testing NetGSM Credentials Only\n');
console.log('Username:', username ? `${username.substring(0, 3)}***${username.slice(-2)}` : 'NOT SET');
console.log('Password:', password ? '***' : 'NOT SET');
console.log('Length:', `username: ${username.length}, password: ${password.length}`);

if (!username || !password) {
  console.error('\n❌ Credentials not configured');
  process.exit(1);
}

(async () => {
  try {
    const netgsm = new Netgsm({ username, password });

    console.log('\n🔄 Attempting to fetch available headers (lightweight API test)...');

    const headers = await netgsm.getHeaders({});

    console.log('\n✅ SUCCESS! Credentials are valid!');
    console.log('Available headers:', JSON.stringify(headers, null, 2));

  } catch (error: any) {
    console.log('\n❌ AUTHENTICATION FAILED');

    if (error.code === '30') {
      console.log('\n🔍 Error Code 30: Invalid username, password, or API access disabled');
      console.log('\nPossible issues:');
      console.log('  1. Username or password is incorrect');
      console.log('  2. API access is not enabled for your account');
      console.log('  3. Account may be suspended or inactive');
      console.log('  4. You might be using the wrong credentials');
      console.log('\n💡 Action required:');
      console.log('  - Log in to NetGSM panel: https://www.netgsm.com.tr');
      console.log('  - Verify your username and password');
      console.log('  - Check if API access is enabled in your account settings');
      console.log('  - Contact NetGSM support if the issue persists');
    } else {
      console.log('\nError details:', JSON.stringify(error, null, 2));
    }

    process.exit(1);
  }
})();
