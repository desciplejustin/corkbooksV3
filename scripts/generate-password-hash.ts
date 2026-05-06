#!/usr/bin/env node

/**
 * Password Hash Generator
 * 
 * Generates PBKDF2 password hashes compatible with the auth system.
 * Run this script to create proper hashes for seed data or user management.
 * 
 * Usage:
 *   node generate-password-hash.js "YourPasswordHere"
 *   
 * Or run interactively (will prompt for password):
 *   node generate-password-hash.js
 */

import { webcrypto } from 'crypto';

// Polyfill for Node.js < 19
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as any;
}

async function hashPassword(password: string, iterations: number = 100000): Promise<string> {
  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // Convert password to key material
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // Derive bits using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  // Convert to hex strings
  const saltHex = Array.from(salt)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Return in custom format
  return `$pbkdf2$${iterations}$${saltHex}$${hashHex}`;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Password Hash Generator for CorkBooks v3');
    console.log('==========================================\n');
    console.log('Usage: node generate-password-hash.js "password"');
    console.log('\nFor security, password should be:');
    console.log('  - At least 12 characters');
    console.log('  - Mix of uppercase, lowercase, numbers, and symbols');
    console.log('  - Not a dictionary word or common pattern\n');
    console.log('Example hashes for development (DO NOT USE IN PRODUCTION):');
    console.log('\nPassword: "DevPassword2026!"');
    const devHash = await hashPassword('DevPassword2026!');
    console.log(`Hash: ${devHash}\n`);
    
    console.log('Password: "EditorPass2026!"');
    const editorHash = await hashPassword('EditorPass2026!');
    console.log(`Hash: ${editorHash}\n`);
    
    console.log('Password: "ViewerPass2026!"');
    const viewerHash = await hashPassword('ViewerPass2026!');
    console.log(`Hash: ${viewerHash}\n`);
    
    return;
  }

  const password = args[0];
  
  if (password.length < 8) {
    console.error('ERROR: Password must be at least 8 characters');
    process.exit(1);
  }

  console.log('Generating hash...');
  const hash = await hashPassword(password);
  console.log('\nPassword Hash:');
  console.log(hash);
  console.log('\nSQL Update Statement:');
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = 'user@example.com';`);
  console.log('\nREMEMBER: Store the original password securely (password manager)');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
