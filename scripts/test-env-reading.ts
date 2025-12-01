import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const password = process.env.NETGSM_PASSWORD || '';

console.log('Raw password value:');
console.log(`Length: ${password.length}`);
console.log(`Value: [${password}]`);
console.log(`Starts with quote: ${password.startsWith('"')}`);
console.log(`Ends with quote: ${password.endsWith('"')}`);
console.log('Character codes:', Array.from(password).map(c => c.charCodeAt(0)));
