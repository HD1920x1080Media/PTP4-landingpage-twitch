/**
 * XOR + Base64 Verschlüsselung/Entschlüsselung für Secrets.
 * 
 * Dieses Modul bietet einfache Verschleierung gegen beiläufige Inspektion (strings, Hex-Editoren).
 * Es ist NICHT kryptographisch sicher und schützt NICHT vor ernsthaften Debuggern.
 * 
 * Der Verschlüsselungsschlüssel ist absichtlich im Quellcode sichtbar, da dies
 * nur Verschleierungssicherheit ist, um das beiläufige Lesen von Secrets zu verhindern.
 * 
 * Anti-Debug-Maßnahmen:
 * - Erkennt, ob Bun/Node mit --inspect-Flag gestartet wurde
 * - Zeitbasierte Erkennung für Debugger, die durch Dekodierungsoperationen treten
 */

/**
 * 32-Byte fester Verschlüsselungsschlüssel für XOR-Kodierung.
 * Dies ist absichtlich hartcodiert, nur als Verschleierung.
 */
const ENCRYPTION_KEY = Buffer.from([
  0x7a, 0x3d, 0x9f, 0x42, 0xc1, 0x56, 0x8e, 0x19,
  0xf2, 0x4b, 0x67, 0xd8, 0x23, 0xa5, 0x88, 0x1c,
  0x6e, 0xb3, 0xc9, 0x5f, 0x17, 0xea, 0x72, 0x46,
  0x9b, 0x31, 0xac, 0x63, 0xd6, 0x7f, 0x14, 0x52,
])

/**
 * Prüft, ob ein Debugger angehängt ist, indem nach --inspect-Flags gesucht wird.
 * Dies ist eine einfache Anti-Debug-Maßnahme, die häufige Debugger-Anhängungsmethoden erkennt.
 * Hinweis: Vermeidet generische Umgebungsvariablen wie DEBUG, um falsche Positive zu verhindern.
 */
function detectDebugger(): boolean {
  // Prüfe auf Node.js/Bun --inspect-Flag in Prozessargumenten
  if (process.argv.some(arg => arg.startsWith('--inspect'))) {
    return true
  }
  
  // Prüfe auf NODE_DEBUG_OPTION-Umgebungsvariable (Debugger-Hinweis)
  if (process.env.NODE_DEBUG_OPTION?.includes('inspect')) {
    return true
  }
  
  return false
}

/**
 * Führt eine zeitbasierte Prüfung durch, um zu erkennen, ob Code von einem Debugger durchlaufen wird.
 * Beim Durchlaufen von Code fügt ein Debugger erheblichen Overhead hinzu (~100-1000x langsamer).
 * Dies führt eine schnelle Zeitmessung durch und prüft, ob das Ergebnis nicht verdächtig langsam ist.
 */
function checkExecutionTiming(): boolean {
  const iterations = 10000
  const start = performance.now()
  
  let sum = 0
  for (let i = 0; i < iterations; i++) {
    // Führe XOR-Operationen durch, die ein Debugger durchlaufen müsste
    sum ^= ENCRYPTION_KEY[i % ENCRYPTION_KEY.length]
    sum = (sum + i) >>> 0  // Behalte als 32-Bit, um Optimierung zu verhindern
  }
  
  const elapsed = performance.now() - start
  
  // Wenn diese einfache Operation länger als 500ms dauerte, wird wahrscheinlich debuggt
  // (Normale Ausführung: ~10-50ms, Debugger-Durchlauf: typischerweise >1000ms)
  // Die Verwendung eines 500ms-Schwellwerts ist konservativ genug, um falsche Positive
  // auf langsamerer Hardware zu vermeiden, während Debugger noch erkannt werden
  if (elapsed > 500) {
    return true
  }
  
  // Speichere das Ergebnis, um Laufzeitoptimierung zu verhindern
  if (typeof globalThis !== 'undefined') {
    (globalThis as typeof globalThis & { _secretsTimingGuard: number })._secretsTimingGuard = sum
  }
  
  return false
}

/**
 * Kodiert einen String mit XOR-Verschlüsselung gefolgt von Base64-Kodierung.
 * Wird während CI/CD verwendet, um Secrets vor dem bun-Build zu kodieren.
 * 
 * @param plaintext - Der zu kodierende Secret-Wert
 * @returns Base64-kodierter XOR-verschlüsselter String
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
 * Dekodiert einen Base64-kodierten XOR-verschlüsselten String zurück zu Klartext.
 * Wird zur Laufzeit verwendet, um in der ausführbaren Datei eingebettete Secrets zu entschlüsseln.
 * Enthält Anti-Debug-Prüfungen.
 * 
 * @param encoded - Base64-kodierter XOR-verschlüsselter String
 * @returns Entschlüsselter Klartextwert
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
 * Dekodiert alle process.env-Secrets, die XOR+Base64 kodiert sind.
 * Dies wird beim Start aufgerufen, um kodierte Werte durch Klartext im Speicher zu ersetzen.
 * Enthält Anti-Debug-Prüfungen, die den Prozess beenden, wenn ein Debugger erkannt wird.
 * 
 * Anti-Debug-Funktionen:
 * 1. Erkennt --inspect-Flag beim Prozessstart
 * 2. Zeitbasierte Erkennung für Debugger, die durchlaufen
 * 
 * Zu dekodierende Umgebungsvariablen (in CI/CD mit __ENCODED_-Präfix definiert):
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
  // Prüfe auf Debugger-Anhängung (--inspect-Flag)
  if (detectDebugger()) {
    console.error('[Main] Application initialization failed.')
    process.exit(1)
  }
  
  // Zeitbasierte Debugger-Prüfung
  if (checkExecutionTiming()) {
    console.error('[Main] Application initialization failed.')
    process.exit(1)
  }
  
  // WICHTIG: Bun's `--compile` inlined nur direkte `process.env.NAME`-Zugriffe.
  // Bracket-Zugriffe wie process.env[`__ENCODED_${key}`] werden NICHT durch die via
  // `--define` gesetzten Konstanten ersetzt und liefern in der EXE undefined.
  // Deshalb listen wir jeden Key einzeln mit direktem Property-Zugriff auf.
  const encodedSecrets: Record<string, string | undefined> = {
    SUPABASE_URL:              process.env.__ENCODED_SUPABASE_URL,
    SUPABASE_API_KEY:          process.env.__ENCODED_SUPABASE_API_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.__ENCODED_SUPABASE_SERVICE_ROLE_KEY,
    TWITCH_CLIENT_ID:          process.env.__ENCODED_TWITCH_CLIENT_ID,
    TWITCH_CLIENT_SECRET:      process.env.__ENCODED_TWITCH_CLIENT_SECRET,
    TWITCH_REFRESH_TOKEN:      process.env.__ENCODED_TWITCH_REFRESH_TOKEN,
    TWITCH_OAUTH_TOKEN:        process.env.__ENCODED_TWITCH_OAUTH_TOKEN,
    CHANNEL_NAME:              process.env.__ENCODED_CHANNEL_NAME,
    EXTENSION_SECRET:          process.env.__ENCODED_EXTENSION_SECRET,
    NGROK_AUTHTOKEN:           process.env.__ENCODED_NGROK_AUTHTOKEN,
    NGROK_DOMAIN:              process.env.__ENCODED_NGROK_DOMAIN,
  }

  for (const [key, encoded] of Object.entries(encodedSecrets)) {
    if (encoded) {
      try {
        process.env[key] = xorBase64Decode(encoded)
      } catch (error) {
        console.error(`[Secrets] Failed to decode ${key}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }
}
