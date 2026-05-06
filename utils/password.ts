// Password hashing utility using Web Crypto API (PBKDF2)
// For use in seed data generation and password management

/**
 * Hash a password using PBKDF2 with Web Crypto API
 * Returns format: $pbkdf2$iterations$salt$hash
 */
export async function hashPassword(password: string, iterations: number = 100000): Promise<string> {
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

// Example usage (for generating seed data):
// const hash = await hashPassword('password123');
// console.log(hash);
