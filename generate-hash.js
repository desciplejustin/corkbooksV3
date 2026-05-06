import { webcrypto } from 'crypto';

async function hashPassword(password) {
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const keyMaterial = await webcrypto.subtle.importKey(
    'raw', 
    encoder.encode(password), 
    'PBKDF2', 
    false, 
    ['deriveBits']
  );
  const derivedBits = await webcrypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' }, 
    keyMaterial, 
    256
  );
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `$pbkdf2$100000$${saltHex}$${hashHex}`;
}

const password = process.argv[2] || 'DevPass2026!';
hashPassword(password).then(hash => {
  console.log('\n===========================================');
  console.log('PASSWORD HASH GENERATED');
  console.log('===========================================');
  console.log('\nPassword:', password);
  console.log('\nHash:');
  console.log(hash);
  console.log('\n===========================================');
  console.log('SQL COMMANDS TO UPDATE DATABASE');
  console.log('===========================================');
  console.log('\n-- For admin user:');
  console.log(`npx wrangler d1 execute corkbookv3_db --local --command "UPDATE users SET password_hash = '${hash}' WHERE email = 'admin@corkbooks.test'"`);
  console.log('\n-- For editor user:');
  console.log(`npx wrangler d1 execute corkbookv3_db --local --command "UPDATE users SET password_hash = '${hash}' WHERE email = 'editor@corkbooks.test'"`);
  console.log('\n===========================================\n');
});
