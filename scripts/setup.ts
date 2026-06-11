#!/usr/bin/env npx tsx
/**
 * Geführter Setup-Assistent für die Landingpage.
 *
 * Aufruf:
 *   npm run setup
 *
 * Leitet Schritt für Schritt durch die komplette Konfiguration und schreibt am
 * Ende zwei Dateien neu:
 *   • src/config/siteConfig.ts  (nur das Daten-Objekt; die Interface-Definitionen
 *     darüber und der dynamische twitch-Block bleiben unverändert erhalten)
 *   • .env                      (VITE_-Variablen für lokale Entwicklung)
 *
 * Mit ENTER übernimmst du jeweils den in [eckigen Klammern] gezeigten Vorgabewert.
 * Es werden keine Tools oder Dependencies installiert — der Assistent nutzt nur
 * tsx (bereits vorhanden) und Node-Bordmittel.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CONFIG_PATH = join(ROOT, 'src', 'config', 'siteConfig.ts')
const ENV_PATH = join(ROOT, '.env')

const CONFIG_MARKER = 'const siteConfig: SiteConfig = {'

// ── Datentypen (Spiegel der Interfaces in siteConfig.ts) ──────────────────────

interface LinkItem {
  titleKey: string
  descKey?: string
  url: string
  icon: string
  target?: '_blank' | '_self'
  discountCode?: string
  downloadFile?: string
  downloadName?: string
}

interface Category {
  id: number
  labelKey: string
  url: string
  color: string
}

interface CollectedConfig {
  profileName: string
  profileImage: string
  impressum: { name: string; company: string; street: string; city: string; email: string }
  streamplanIcsUrl: string
  categories: Category[]
  donationUrl: string
  donationLabel: string
  donationLogo: string
  links: LinkItem[]
  games: LinkItem[]
  clips: LinkItem[]
  partners: LinkItem[]
  copyrightHolder: string
  onlyBartTitle: string
  onlyBartLogo: string
  accentColor: string
  redirects: Record<string, string>
  env: { supabaseUrl: string; supabaseAnonKey: string; twitchClientId: string; channelName: string }
}

// ── Eingabe-Helfer ────────────────────────────────────────────────────────────
// Zwei Modi: am Terminal (TTY) interaktiv via readline; bei umgeleiteter Eingabe
// (Pipe/Datei, z.B. in Skripten/Tests) werden die Zeilen vorab gelesen und der
// Reihe nach beantwortet. So ist der Assistent sowohl interaktiv als auch
// automatisierbar.

const interactive = Boolean(input.isTTY)
const rl = interactive ? createInterface({ input, output }) : null
let queued: string[] = []
let queueIndex = 0

function readAllStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = ''
    input.setEncoding('utf-8')
    input.on('data', (chunk) => { data += chunk })
    input.on('end', () => resolve(data))
    input.on('error', () => resolve(data))
  })
}

async function rawPrompt(label: string): Promise<string> {
  if (rl) return rl.question(label)
  // Nicht-interaktiv: Prompt anzeigen, nächste vorgelesene Zeile zurückgeben.
  output.write(label)
  const line = queueIndex < queued.length ? queued[queueIndex++] : ''
  output.write(`${line}\n`)
  return line
}

async function ask(question: string, fallback = ''): Promise<string> {
  const suffix = fallback ? ` [${fallback}]` : ''
  const answer = (await rawPrompt(`${question}${suffix}: `)).trim()
  return answer || fallback
}

async function askYesNo(question: string, def = false): Promise<boolean> {
  const hint = def ? 'J/n' : 'j/N'
  const a = (await rawPrompt(`${question} (${hint}): `)).trim().toLowerCase()
  if (!a) return def
  return a === 'j' || a === 'ja' || a === 'y' || a === 'yes'
}

async function askColor(question: string, fallback: string): Promise<string> {
  for (;;) {
    const value = await ask(question, fallback)
    if (/^#[0-9a-fA-F]{6}$/.test(value)) return value
    console.log('  ⚠️  Bitte einen Hex-Farbwert im Format #RRGGBB eingeben.')
  }
}

function heading(title: string): void {
  console.log(`\n[1m── ${title} ──[0m`)
}

/** Sammelt eine Liste von Link-Karten (für Hauptlinks, Games, Clips, Partner). */
async function collectLinkItems(label: string, withDiscount: boolean): Promise<LinkItem[]> {
  const items: LinkItem[] = []
  console.log(`\nLeeren titleKey eingeben (nur ENTER), um ${label} abzuschließen.`)
  for (;;) {
    const titleKey = await ask(`  ${label} #${items.length + 1} – titleKey`)
    if (!titleKey) break
    const descKey = await ask('    descKey (optional)')
    const url = await ask('    url (z.B. /streamplan oder https://…)')
    const icon = await ask('    icon (Pfad in public/, z.B. /img/logos/x.webp)')
    const external = await askYesNo('    Externer Link (neuer Tab)?', url.startsWith('http'))
    const discountCode = withDiscount ? await ask('    discountCode (optional)') : ''
    const downloadFile = await ask('    downloadFile-URL (optional, löst Download-Dialog aus)')
    const downloadName = downloadFile ? await ask('    downloadName (Dateiname)') : ''
    items.push({
      titleKey,
      descKey: descKey || undefined,
      url,
      icon,
      target: external ? '_blank' : '_self',
      discountCode: discountCode || undefined,
      downloadFile: downloadFile || undefined,
      downloadName: downloadName || undefined,
    })
  }
  return items
}

/** Sammelt die Streamplan-Kategorien (IDs werden automatisch fortlaufend vergeben). */
async function collectCategories(): Promise<Category[]> {
  const categories: Category[] = []
  console.log('\nLeeren labelKey eingeben (nur ENTER), um die Kategorien abzuschließen.')
  for (;;) {
    const id = categories.length + 1
    const labelKey = await ask(`  Kategorie #${id} – labelKey (z.B. streamplan.categories.gog)`)
    if (!labelKey) break
    const url = await ask('    ICS-URL der Kategorie')
    const color = await askColor('    Farbe (#RRGGBB)', '#7C4DFF')
    categories.push({ id, labelKey, url, color })
  }
  return categories
}

/** Sammelt Kurz-URL-Weiterleitungen (Pfad → Ziel-URL). */
async function collectRedirects(): Promise<Record<string, string>> {
  const redirects: Record<string, string> = {}
  console.log('\nLeeren Pfad eingeben (nur ENTER), um die Weiterleitungen abzuschließen.')
  for (;;) {
    const path = await ask('  Pfad (z.B. /discord)')
    if (!path) break
    const target = await ask('    Ziel-URL')
    if (!target) continue
    redirects[path.startsWith('/') ? path : `/${path}`] = target
  }
  return redirects
}

// ── Serialisierung ──────────────────────────────────────────────────────────

/** Einfach-gequoteter TS-String mit Escaping für Backslash und Anführungszeichen. */
function q(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

function emitLinkItem(item: LinkItem): string[] {
  const lines: string[] = ['    {']
  lines.push(`      titleKey: ${q(item.titleKey)},`)
  if (item.descKey) lines.push(`      descKey: ${q(item.descKey)},`)
  lines.push(`      url: ${q(item.url)},`)
  lines.push(`      icon: ${q(item.icon)},`)
  if (item.target) lines.push(`      target: ${q(item.target)},`)
  if (item.discountCode) lines.push(`      discountCode: ${q(item.discountCode)},`)
  if (item.downloadFile) lines.push(`      downloadFile: ${q(item.downloadFile)},`)
  if (item.downloadName) lines.push(`      downloadName: ${q(item.downloadName)},`)
  lines.push('    },')
  return lines
}

function emitLinkArray(name: string, items: LinkItem[]): string[] {
  if (items.length === 0) return [`  ${name}: [],`]
  const lines: string[] = [`  ${name}: [`]
  for (const item of items) lines.push(...emitLinkItem(item))
  lines.push('  ],')
  return lines
}

/** Baut das komplette `const siteConfig: SiteConfig = { … }`-Literal als Quelltext. */
function buildConfigObject(c: CollectedConfig): string {
  const lines: string[] = []
  lines.push('const siteConfig: SiteConfig = {')
  lines.push('  // ── Profil ──')
  lines.push('  profile: {')
  lines.push(`    name: ${q(c.profileName)},`)
  lines.push("    subtitleKey: 'hero.subtitle',")
  lines.push(`    image: ${q(c.profileImage)},`)
  lines.push('  },')
  lines.push('')
  lines.push('  // ── Twitch (Kanal via VITE_CHANNEL_NAME) ──')
  lines.push('  twitch: {')
  lines.push('    channel: (import.meta.env.VITE_CHANNEL_NAME as string),')
  lines.push('    chatFallbackUrl:')
  lines.push('      `https://www.twitch.tv/${(import.meta.env.VITE_CHANNEL_NAME as string)}/chat`,')
  lines.push("    icsUrl: '/api/calendar.ics',")
  lines.push("    idLookupUrl: 'https://decapi.me/twitch/id/',")
  lines.push('  },')
  lines.push('')
  lines.push('  // ── Impressum ──')
  lines.push('  impressum: {')
  lines.push(`    name: ${q(c.impressum.name)},`)
  lines.push(`    company: ${q(c.impressum.company)},`)
  lines.push(`    street: ${q(c.impressum.street)},`)
  lines.push(`    city: ${q(c.impressum.city)},`)
  lines.push(`    email: ${q(c.impressum.email)},`)
  lines.push('  },')
  lines.push('')
  lines.push('  // ── Streamplan ──')
  lines.push('  streamplan: {')
  lines.push(`    icsUrl: ${q(c.streamplanIcsUrl)},`)
  if (c.categories.length === 0) {
    lines.push('    categories: [],')
  } else {
    lines.push('    categories: [')
    for (const cat of c.categories) {
      lines.push('      {')
      lines.push(`        id: ${cat.id},`)
      lines.push(`        labelKey: ${q(cat.labelKey)},`)
      lines.push(`        url: ${q(cat.url)},`)
      lines.push(`        color: ${q(cat.color)},`)
      lines.push('      },')
    }
    lines.push('    ],')
  }
  lines.push('  },')
  lines.push('')
  lines.push('  // ── Donations ──')
  lines.push('  streamelements: {')
  lines.push(`    donationUrl: ${q(c.donationUrl)},`)
  lines.push(`    label: ${q(c.donationLabel)},`)
  lines.push(`    logoUrl: ${q(c.donationLogo)},`)
  lines.push('  },')
  lines.push('')
  lines.push('  // ── Haupt-Links ──')
  lines.push(...emitLinkArray('links', c.links))
  lines.push('')
  lines.push('  // ── Games ──')
  lines.push(...emitLinkArray('games', c.games))
  lines.push('')
  lines.push('  // ── Clips & Shorts ──')
  lines.push(...emitLinkArray('clips', c.clips))
  lines.push('')
  lines.push('  // ── Partner ──')
  lines.push(...emitLinkArray('partners', c.partners))
  lines.push('')
  lines.push("  moderatorLink: { labelKey: 'profile.moderate', url: '/moderate' },")
  lines.push('')
  lines.push('  // ── Footer ──')
  lines.push('  footerLinks: [')
  lines.push("    { labelKey: 'footer.impressum', url: '/impressum' },")
  lines.push("    { labelKey: 'footer.datenschutz', url: '/datenschutz' },")
  lines.push('  ],')
  lines.push(`  copyrightHolder: ${q(c.copyrightHolder)},`)
  lines.push('')
  lines.push('  onlyBart: {')
  lines.push(`    title: ${q(c.onlyBartTitle)},`)
  lines.push(`    logoUrl: ${q(c.onlyBartLogo)},`)
  lines.push('  },')
  lines.push('')
  lines.push(`  accentColor: ${q(c.accentColor)},`)
  lines.push('')
  lines.push('  redirects: {')
  for (const [path, target] of Object.entries(c.redirects)) {
    lines.push(`    ${q(path)}: ${q(target)},`)
  }
  lines.push('  },')
  lines.push('}')
  return lines.join('\n')
}

function buildEnvFile(env: CollectedConfig['env']): string {
  return [
    '# ── Supabase ──',
    `VITE_SUPABASE_URL=${env.supabaseUrl}`,
    `VITE_SUPABASE_ANON_KEY=${env.supabaseAnonKey}`,
    '',
    '# ── Twitch ──',
    `VITE_TWITCH_CLIENT_ID=${env.twitchClientId}`,
    `VITE_CHANNEL_NAME=${env.channelName}`,
    '',
  ].join('\n')
}

// ── Ablauf ────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  if (!interactive) {
    const data = await readAllStdin()
    queued = data.split(/\r?\n/)
  }

  console.log('\n[1m🛠️  Setup-Assistent – Twitch Landingpage[0m')
  console.log('Beantworte die Fragen Schritt für Schritt. ENTER übernimmt den Vorgabewert.')
  console.log('Am Ende werden src/config/siteConfig.ts und .env neu geschrieben.\n')

  if (!existsSync(CONFIG_PATH)) {
    console.error(`❌ ${CONFIG_PATH} nicht gefunden — bist du im Projekt-Root?`)
    return
  }
  const existing = readFileSync(CONFIG_PATH, 'utf-8')
  const markerIndex = existing.indexOf(CONFIG_MARKER)
  if (markerIndex === -1) {
    console.error(`❌ Marker "${CONFIG_MARKER}" nicht in siteConfig.ts gefunden — Abbruch ohne Änderung.`)
    return
  }

  heading('1/9 · Profil')
  const profileName = await ask('Anzeigename auf der Startseite', 'MeinKanal')
  const profileImage = await ask('Profilbild-Pfad', '/img/logos/HDProfile.webp')

  heading('2/9 · Impressum (Pflichtangaben laut TMG)')
  const impressum = {
    name: await ask('Vollständiger Name', 'Dein Name'),
    company: await ask('Firma (leer lassen, falls keine)', ''),
    street: await ask('Straße & Nr.', 'Musterstraße 1'),
    city: await ask('PLZ & Ort', '12345 Musterstadt'),
    email: await ask('Kontakt-E-Mail', 'kontakt@deinkanal.de'),
  }

  heading('3/9 · Streamplan (kalender.digital)')
  const streamplanIcsUrl = await ask('Haupt-ICS-URL', 'https://export.kalender.digital/ics/0/TOKEN/deinkanal.ics')
  const categories = await collectCategories()

  heading('4/9 · Donations')
  const donationUrl = await ask('Donation-URL (Tip-Page)', 'https://streamelements.com/deinkanal/tip')
  const donationLabel = await ask('Provider-Name auf der Karte', 'StreamElements')
  const donationLogo = await ask('Provider-Logo-Pfad', '/img/logos/StreamElements.webp')

  heading('5/9 · Haupt-Links')
  const links = await collectLinkItems('Link', false)

  heading('6/9 · Games & Clips')
  const games = await collectLinkItems('Game', false)
  const clips = await collectLinkItems('Clip', false)

  heading('7/9 · Partner (mit optionalem Rabattcode)')
  const partners = await collectLinkItems('Partner', true)

  heading('8/9 · Design, Branding & Weiterleitungen')
  const accentColor = await askColor('Akzentfarbe (#RRGGBB)', '#7C4DFF')
  const copyrightHolder = await ask('Copyright-Inhaber (Footer)', impressum.company || profileName)
  const onlyBartTitle = await ask('Name des Premium-Bereichs', 'OnlyBart')
  const onlyBartLogo = await ask('Premium-Logo-Pfad', '/img/logos/OB.webp')
  const redirects = await collectRedirects()

  heading('9/9 · Umgebungsvariablen (.env)')
  const env = {
    supabaseUrl: await ask('VITE_SUPABASE_URL', 'https://dein-projekt.supabase.co'),
    supabaseAnonKey: await ask('VITE_SUPABASE_ANON_KEY', ''),
    twitchClientId: await ask('VITE_TWITCH_CLIENT_ID', ''),
    channelName: await ask('VITE_CHANNEL_NAME (Kanalname, klein)', profileName.toLowerCase()),
  }

  const collected: CollectedConfig = {
    profileName, profileImage, impressum, streamplanIcsUrl, categories,
    donationUrl, donationLabel, donationLogo, links, games, clips, partners,
    copyrightHolder, onlyBartTitle, onlyBartLogo, accentColor, redirects, env,
  }

  // Zusammenfassung + Bestätigung
  heading('Zusammenfassung')
  console.log(`  Profil:        ${profileName} (${profileImage})`)
  console.log(`  Impressum:     ${impressum.name}, ${impressum.email}`)
  console.log(`  Kategorien:    ${categories.length}`)
  console.log(`  Links/Games/Clips/Partner: ${links.length}/${games.length}/${clips.length}/${partners.length}`)
  console.log(`  Weiterleitungen: ${Object.keys(redirects).length}`)
  console.log(`  Akzentfarbe:   ${accentColor}`)
  console.log('')
  console.log('  Es werden überschrieben:')
  console.log(`    • ${CONFIG_PATH}`)
  console.log(`    • ${ENV_PATH}${existsSync(ENV_PATH) ? '  (existiert bereits!)' : ''}`)
  console.log('')

  if (!(await askYesNo('Jetzt schreiben?', true))) {
    console.log('Abgebrochen — es wurde nichts geändert.')
    return
  }

  const prefix = existing.slice(0, markerIndex)
  const newConfig = `${prefix}${buildConfigObject(collected)}\n\nexport default siteConfig\n`
  writeFileSync(CONFIG_PATH, newConfig, 'utf-8')
  writeFileSync(ENV_PATH, buildEnvFile(env), 'utf-8')

  console.log('\n✅ Fertig!')
  console.log('   • src/config/siteConfig.ts geschrieben')
  console.log('   • .env geschrieben (nicht committen — steht in .gitignore)')
  console.log('\nNächste Schritte:')
  console.log('   1. Bilder in public/img/logos/ ersetzen (siehe SETUP.md, Schritt 4)')
  console.log('   2. Texte in src/i18n/locales/de.json an deine titleKey/descKey anpassen')
  console.log('   3. npm run lint && npm run dev')
}

run()
  .catch((err) => {
    console.error('\n❌ Fehler im Setup-Assistenten:', err)
    process.exitCode = 1
  })
  .finally(() => rl?.close())
