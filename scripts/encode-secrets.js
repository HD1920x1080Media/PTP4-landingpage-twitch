#!/usr/bin/env node
/**
 * Script zum Kodieren von Secrets mit XOR+Base64 vor dem bun-Build.
 * 
 * Verwendung: node scripts/encode-secrets.js <secret-value>
 * 
 * Gibt den kodierten Wert als JSON-String aus (wie von Buns --define erwartet).
 */

const ENCRYPTION_KEY = Buffer.from([
  0x7a, 0x3d, 0x9f, 0x42, 0xc1, 0x56, 0x8e, 0x19,
  0xf2, 0x4b, 0x67, 0xd8, 0x23, 0xa5, 0x88, 0x1c,
  0x6e, 0xb3, 0xc9, 0x5f, 0x17, 0xea, 0x72, 0x46,
  0x9b, 0x31, 0xac, 0x63, 0xd6, 0x7f, 0x14, 0x52,
])

function xorBase64Encode(plaintext) {
  const buffer = Buffer.from(plaintext, 'utf8')
  const xored = Buffer.alloc(buffer.length)
  
  for (let i = 0; i < buffer.length; i++) {
    xored[i] = buffer[i] ^ ENCRYPTION_KEY[i % ENCRYPTION_KEY.length]
  }
  
  return xored.toString('base64')
}

// Lese Secret aus Kommandozeilenargument oder stdin
const secret = process.argv[2] || ''

if (!secret) {
  console.error('Usage: node encode-secrets.js <secret-value>')
  process.exit(1)
}

const encoded = xorBase64Encode(secret)
// Gebe als JSON-String aus (wie Bun --define erwartet)
console.log(JSON.stringify(encoded))
