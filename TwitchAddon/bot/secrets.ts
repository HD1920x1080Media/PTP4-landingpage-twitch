/**
 * XOR + Base64 encoding/decoding utilities for secrets.
 * 
 * This module provides simple obfuscation against casual inspection (strings, hex editors).
 * It is NOT cryptographically secure and does NOT protect against debuggers.
 * 
 * The encryption key is deliberately exposed in source code as this is
 * obfuscation-level security only, meant to prevent casual reading of secrets.
 */

/**
 * 32-byte fixed encryption key used for XOR encoding.
 * This is intentionally hard-coded as obfuscation only.
 */
const ENCRYPTION_KEY = Buffer.from([
  0x7a, 0x3d, 0x9f, 0x42, 0xc1, 0x56, 0x8e, 0x19,
  0xf2, 0x4b, 0x67, 0xd8, 0x23, 0xa5, 0x88, 0x1c,
  0x6e, 0xb3, 0xc9, 0x5f, 0x17, 0xea, 0x72, 0x46,
  0x9b, 0x31, 0xac, 0x63, 0xd6, 0x7f, 0x14, 0x52,
])

/**
 * Encodes a string using XOR encryption followed by Base64 encoding.
 * Used during CI/CD to encode secrets before bun build.
 * 
 * @param plaintext - The secret value to encode
 * @returns Base64-encoded XOR-encrypted string
 */
export function xorBase64Encode(plaintext: string): string {
  const buffer = Buffer.from(plaintext, 'utf8')
  const xored = Buffer.alloc(buffer.length)
  
  for (let i = 0; i < buffer.length; i++) {
    xored[i] = buffer[i] ^ ENCRYPTION_KEY[i % ENCRYPTION_KEY.length]
  }
  
  return xored.toString('base64')
}

/**
 * Decodes a Base64-encoded XOR-encrypted string back to plaintext.
 * Used at runtime to decrypt secrets embedded in the executable.
 * 
 * @param encoded - Base64-encoded XOR-encrypted string
 * @returns Decrypted plaintext value
 */
export function xorBase64Decode(encoded: string): string {
  const buffer = Buffer.from(encoded, 'base64')
  const decoded = Buffer.alloc(buffer.length)
  
  for (let i = 0; i < buffer.length; i++) {
    decoded[i] = buffer[i] ^ ENCRYPTION_KEY[i % ENCRYPTION_KEY.length]
  }
  
  return decoded.toString('utf8')
}

/**
 * Decodes all process.env secrets that are XOR+Base64 encoded.
 * This is called at startup to replace encoded values with plaintext in memory.
 * 
 * Environment variables to decode (those defined in CI/CD with __ENCODED_ prefix):
 * - SUPABASE_URL
 * - SUPABASE_API_KEY
 * - SUPABASE_SERVICE_ROLE_KEY
 * - TWITCH_CLIENT_ID
 * - TWITCH_CLIENT_SECRET
 * - TWITCH_REFRESH_TOKEN
 * - TWITCH_OAUTH_TOKEN
 * - CHANNEL_NAME
 * - EXTENSION_SECRET
 * - NGROK_AUTHTOKEN
 * - NGROK_DOMAIN
 */
export function decodeAllSecrets(): void {
  const secretKeys = [
    'SUPABASE_URL',
    'SUPABASE_API_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'TWITCH_CLIENT_ID',
    'TWITCH_CLIENT_SECRET',
    'TWITCH_REFRESH_TOKEN',
    'TWITCH_OAUTH_TOKEN',
    'CHANNEL_NAME',
    'EXTENSION_SECRET',
    'NGROK_AUTHTOKEN',
    'NGROK_DOMAIN',
  ]

  for (const key of secretKeys) {
    const encoded = process.env[`__ENCODED_${key}`]
    if (encoded) {
      try {
        process.env[key] = xorBase64Decode(encoded)
        // Clear the encoded version to avoid having both in memory
        delete process.env[`__ENCODED_${key}`]
      } catch (error) {
        console.error(`[Secrets] Failed to decode ${key}:`, error)
      }
    }
  }
}
