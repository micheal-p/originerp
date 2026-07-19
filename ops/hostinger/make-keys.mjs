// Generates JWT_SECRET + the anon/service_role JWTs that pair with it.
// No npm deps — HS256 signed by hand with node:crypto.
//
// Usage: node make-keys.mjs
// Paste the three printed lines into .env.

import { randomBytes, createHmac } from 'node:crypto';

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const sign = (payload, secret) => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const head = b64url(JSON.stringify(header));
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', secret).update(`${head}.${body}`).digest();
  return `${head}.${body}.${b64url(sig)}`;
};

const jwtSecret = randomBytes(32).toString('hex');
const iat = Math.floor(Date.now() / 1000);
const exp = iat + 60 * 60 * 24 * 365 * 10; // 10 years — long-lived service keys, same as Supabase's own defaults

const anonKey = sign({ role: 'anon', iss: 'supabase', iat, exp }, jwtSecret);
const serviceRoleKey = sign({ role: 'service_role', iss: 'supabase', iat, exp }, jwtSecret);

console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`ANON_KEY=${anonKey}`);
console.log(`SERVICE_ROLE_KEY=${serviceRoleKey}`);
