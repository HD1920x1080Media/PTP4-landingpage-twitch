#!/usr/bin/env npx tsx
/**
 * Automatische JSON-Übersetzung via Google Translate (Free API).
 *
 * Aufruf:
 * npm run translate -- fr es ja
 * npm run translate -- --sl en fr es  (Quellsprache Englisch)
 *
 * Optionen:
 * --sl <lang> Quellsprache definieren (Default: de)
 * --force     Bereits vorhandene JSON-Dateien überschreiben
 * --dry-run   Vorschau ohne Dateien zu schreiben
 */

import {readFileSync, writeFileSync, existsSync} from 'node:fs'
import {join, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ── Sprachdaten (Flag + nativer Name) ────────────────────────────────────────

const LANGUAGE_INFO: Record<string, { native: string; flag: string }> = {
    af: {native: 'Afrikaans', flag: '🇿🇦'},
    am: {native: 'አማርኛ', flag: '🇪🇹'},
    ar: {native: 'العربية', flag: '🇸🇦'},
    az: {native: 'Azərbaycan dili', flag: '🇦🇿'},
    be: {native: 'Беларуская', flag: '🇧🇾'},
    bg: {native: 'Български', flag: '🇧🇬'},
    bn: {native: 'বাংলা', flag: '🇧🇩'},
    bs: {native: 'Bosanski', flag: '🇧🇦'},
    ca: {native: 'Català', flag: '🇦🇩'},
    cs: {native: 'Čeština', flag: '🇨🇿'},
    cy: {native: 'Cymraeg', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿'},
    da: {native: 'Dansk', flag: '🇩🇰'},
    de: {native: 'Deutsch', flag: '🇩🇪'},
    el: {native: 'Ελληνικά', flag: '🇬🇷'},
    en: {native: 'English', flag: '🇬🇧'},
    es: {native: 'Español', flag: '🇪🇸'},
    et: {native: 'Eesti', flag: '🇪🇪'},
    eu: {native: 'Euskara', flag: '🇪🇸'},
    fa: {native: 'فارسی', flag: '🇮🇷'},
    fi: {native: 'Suomi', flag: '🇫🇮'},
    fr: {native: 'Français', flag: '🇫🇷'},
    ga: {native: 'Gaeilge', flag: '🇮🇪'},
    gl: {native: 'Galego', flag: '🇪🇸'},
    gu: {native: 'ગુજરાતી', flag: '🇮🇳'},
    he: {native: 'עברית', flag: '🇮🇱'},
    hi: {native: 'हिन्दी', flag: '🇮🇳'},
    hr: {native: 'Hrvatski', flag: '🇭🇷'},
    hu: {native: 'Magyar', flag: '🇭🇺'},
    hy: {native: 'Հայերեն', flag: '🇦🇲'},
    id: {native: 'Bahasa Indonesia', flag: '🇮🇩'},
    is: {native: 'Íslenska', flag: '🇮🇸'},
    it: {native: 'Italiano', flag: '🇮🇹'},
    ja: {native: '日本語', flag: '🇯🇵'},
    jv: {native: 'Basa Jawa', flag: '🇮🇩'},
    ka: {native: 'ქართული', flag: '🇬🇪'},
    kk: {native: 'Қазақ тілі', flag: '🇰🇿'},
    km: {native: 'ខ្មែរ', flag: '🇰🇭'},
    kn: {native: 'ಕನ್ನಡ', flag: '🇮🇳'},
    ko: {native: '한국어', flag: '🇰🇷'},
    ky: {native: 'Кыргызча', flag: '🇰🇬'},
    lo: {native: 'ລາວ', flag: '🇱🇦'},
    lt: {native: 'Lietuvių', flag: '🇱🇹'},
    lv: {native: 'Latviešu', flag: '🇱🇻'},
    mk: {native: 'Македонски', flag: '🇲🇰'},
    ml: {native: 'മലയാളം', flag: '🇮🇳'},
    mn: {native: 'Монгол хэл', flag: '🇲🇳'},
    mr: {native: 'मराठी', flag: '🇮🇳'},
    ms: {native: 'Bahasa Melayu', flag: '🇲🇾'},
    mt: {native: 'Malti', flag: '🇲🇹'},
    my: {native: 'ဗမာစာ', flag: '🇲🇲'},
    ne: {native: 'नेपाली', flag: '🇳🇵'},
    nl: {native: 'Nederlands', flag: '🇳🇱'},
    no: {native: 'Norsk', flag: '🇳🇴'},
    pa: {native: 'ਪੰਜਾਬੀ', flag: '🇮🇳'},
    pl: {native: 'Polski', flag: '🇵🇱'},
    pt: {native: 'Português', flag: '🇵🇹'},
    ro: {native: 'Română', flag: '🇷🇴'},
    ru: {native: 'Русский', flag: '🇷🇺'},
    si: {native: 'සිංහල', flag: '🇱🇰'},
    sk: {native: 'Slovenčina', flag: '🇸🇰'},
    sl: {native: 'Slovenščina', flag: '🇸🇮'},
    sq: {native: 'Shqip', flag: '🇦🇱'},
    sr: {native: 'Српски', flag: '🇷🇸'},
    sv: {native: 'Svenska', flag: '🇸🇪'},
    sw: {native: 'Kiswahili', flag: '🇰🇪'},
    ta: {native: 'தமிழ்', flag: '🇮🇳'},
    te: {native: 'తెలుగు', flag: '🇮🇳'},
    th: {native: 'ไทย', flag: '🇹🇭'},
    tr: {native: 'Türkçe', flag: '🇹🇷'},
    uk: {native: 'Українська', flag: '🇺🇦'},
    ur: {native: 'اردو', flag: '🇵🇰'},
    uz: {native: 'Oʻzbekcha', flag: '🇺🇿'},
    vi: {native: 'Tiếng Việt', flag: '🇻🇳'},
    zh: {native: '中文 (简体)', flag: '🇨🇳'},
    zhTW: {native: '中文 (繁體)', flag: '🇹🇼'},
    zu: {native: 'isiZulu', flag: '🇿🇦'}
};

// Diese Pfade werden NICHT übersetzt (reine Abkürzungen/Kürzel)
const SKIP_PATHS = new Set(['bartclicker.unitArray'])

// ── i18next-Interpolationsvariablen schützen ─────────────────────────────────

function protectVars(text: string): { safe: string; map: string[] } {
    const map: string[] = []
    const safe = text.replace(/\{\{[^}]+}}/g, match => {
        map.push(match)
        return `__TVar${map.length - 1}__`
    })
    return {safe, map}
}

function restoreVars(text: string, map: string[]): string {
    return text.replace(/__TVar(\d+)__/g, (_, i) => map[Number(i)] ?? _)
}

// ── JSON-Traversierung ───────────────────────────────────────────────────────

type Entry = { path: string; safe: string; varMap: string[] }

function collectStrings(value: unknown, path: string): Entry[] {
    if (typeof value === 'string') {
        if (!value.trim()) return []
        const {safe, map} = protectVars(value)
        return [{path, safe, varMap: map}]
    }
    if (Array.isArray(value)) {
        if (SKIP_PATHS.has(path)) return []
        return value.flatMap((v, i) => collectStrings(v, `${path}[${i}]`))
    }
    if (value !== null && typeof value === 'object') {
        return Object.entries(value).flatMap(([k, v]) =>
            collectStrings(v, path ? `${path}.${k}` : k)
        )
    }
    return []
}

function setDeep(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.replace(/\[(\d+)]/g, '.$1').split('.')
    let cur: Record<string, unknown> = obj
    for (let i = 0; i < parts.length - 1; i++) {
        cur = cur[parts[i]] as Record<string, unknown>
    }
    cur[parts[parts.length - 1]] = value
}

// ── Google Translate API (Free/gtx) ──────────────────────────────────────────

async function translateText(text: string, targetLang: string, sourceLang: string): Promise<string> {
    let tl = targetLang === 'zh' ? 'zh-CN' : targetLang
    tl = tl === 'zhTW' ? 'zh-TW' : tl

    const url = `https://translate.googleapis.com/translate_a/single`
    const params = new URLSearchParams({
        client: 'gtx',
        sl: sourceLang, // Wird nun dynamisch übergeben
        tl: tl,
        dt: 't',
        q: text
    })

    const res = await fetch(`${url}?${params.toString()}`)

    if (!res.ok) {
        throw new Error(`Google Translate Error ${res.status}: ${await res.text()}`)
    }

    const data = (await res.json()) as unknown[][][]
    return data[0].map((chunk: unknown[]) => String(chunk[0])).join('')
}

async function translateAll(entries: Entry[], targetLang: string, sourceLang: string): Promise<Map<string, string>> {
    const result = new Map<string, string>()

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]
        process.stdout.write(`\r  Übersetze ${i + 1} / ${entries.length} ... `)

        try {
            const translated = await translateText(entry.safe, targetLang, sourceLang)
            result.set(entry.path, restoreVars(translated, entry.varMap))
        } catch (error) {
            console.error(`\n❌ Fehler bei String "${entry.safe}":`, error)
        }

        await new Promise(r => setTimeout(r, 300))
    }

    console.log('✓')
    return result
}

// ── i18n.ts patchen ──────────────────────────────────────────────────────────

function patchI18nTs(lang: string): void {
    const filePath = join(ROOT, 'src', 'i18n', 'i18n.ts')
    if (!existsSync(filePath)) return

    const lines = readFileSync(filePath, 'utf-8').split('\n')
    const varName = lang.replace('-', '_')

    // 1. Import hinzufügen, falls noch nicht vorhanden
    if (!lines.some((l: string) => l.includes(`'./locales/${lang}.json'`))) {
        const lastImportIdx = lines.reduce((last: number, l: string, i: number) =>
            l.includes("from './locales/") ? i : last, -1)
        if (lastImportIdx >= 0) {
            lines.splice(lastImportIdx + 1, 0, `import ${varName} from './locales/${lang}.json'`)
        }
    }

    // 2. Zu resources hinzufügen, falls noch nicht vorhanden
    const resourceString = `${varName}: { translation: ${varName} }`
    if (!lines.some((l: string) => l.includes(resourceString))) {
        const resStartIdx = lines.findIndex((l: string) => l.includes('resources: {'))
        if (resStartIdx >= 0) {
            // Fügt die neue Sprache direkt am Anfang des resources-Blocks ein
            lines.splice(resStartIdx + 1, 0, `      ${varName}: { translation: ${varName} },`)
        }
    }

    // 3. Zu supportedLngs hinzufügen, falls noch nicht vorhanden
    if (!lines.some((l: string) => l.includes(`'${lang}'`) && l.includes('supportedLngs:'))) {
        const slIdx = lines.findIndex((l: string) => l.includes('supportedLngs:'))
        if (slIdx >= 0) {
            const line = lines[slIdx]
            const lastBracketIdx = line.lastIndexOf(']')
            if (lastBracketIdx >= 0) {
                lines[slIdx] = `${line.slice(0, lastBracketIdx)}, '${lang}'${line.slice(lastBracketIdx)}`
            }
        }
    }

    writeFileSync(filePath, lines.join('\n'), 'utf-8')
    console.log('  ✓ src/i18n/i18n.ts aktualisiert')
}

// ── SettingsBar.tsx patchen ───────────────────────────────────────────────────

function patchSettingsBar(lang: string): void {
    const filePath = join(ROOT, 'src', 'components', 'SettingsBar', 'SettingsBar.tsx')
    if (!existsSync(filePath)) return

    const lines = readFileSync(filePath, 'utf-8').split('\n')
    const info = LANGUAGE_INFO[lang] || {native: lang.toUpperCase(), flag: '🌐'}

    if (lines.some((l: string) => l.includes(`value="${lang}"`))) return

    const lastFlagIdx = lines.reduce((last: number, l: string, i: number) =>
        /^\s+\w+: '/.test(l) && lines[i - 1]?.includes('languageFlags') || last >= 0 && /^\s+\w+: '/.test(l) ? i : last, -1)
    if (lastFlagIdx >= 0) lines.splice(lastFlagIdx + 1, 0, `  ${lang}: '${info.flag}',`)

    const orderIdx = lines.findIndex((l: string) => l.includes('const langOrder = ['))
    if (orderIdx >= 0) lines[orderIdx] = lines[orderIdx].replace(/] as const/, `, '${lang}'] as const`)

    const returnIdx = lines.findIndex((l: string, i: number) => i > 0 && l.trim().startsWith("return '") &&
        lines[i - 1]?.trim().startsWith('if (language'))
    if (returnIdx >= 0) lines.splice(returnIdx, 0, `  if (language?.startsWith('${lang}')) return '${lang}'`)

    const selectCloseIdx = lines.findIndex((l: string) => l.includes('</select>'))
    if (selectCloseIdx >= 0) {
        lines.splice(selectCloseIdx, 0, `          <option value="${lang}">${info.flag} ${info.native}</option>`)
    }

    writeFileSync(filePath, lines.join('\n'), 'utf-8')
    console.log(`  ✓ src/components/SettingsBar/SettingsBar.tsx aktualisiert (Flag: ${info.flag})`)
}

// ── Hauptprogramm ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const argv = process.argv.slice(2)
    const force = argv.includes('--force')
    const dryRun = argv.includes('--dry-run')

    // Auslesen der Quellsprache (--sl)
    let sourceLang = 'de'
    const slIndex = argv.indexOf('--sl')
    if (slIndex !== -1 && argv.length > slIndex + 1) {
        sourceLang = argv[slIndex + 1]
    }

// Filtere CLI Flags und das Argument nach --sl heraus, um nur Zielsprachen zu behalten
    const langs = argv.filter((a: string, i: number) => {
        if (a.startsWith('--')) return false
        return !(i > 0 && argv[i - 1] === '--sl');
    })

    if (langs.length === 0) {
        console.error('Verwendung: npm run translate -- [--sl <source>] <lang1> [lang2] ...')
        console.error('Beispiel:   npm run translate -- --sl en fr es ja')
        process.exit(1)
    }

    // Nutze dynamisch ermittelte Quellsprache für die Basis-Datei
    const sourcePath = join(ROOT, `src/i18n/locales/${sourceLang}.json`)
    if (!existsSync(sourcePath)) {
        console.error(`❌ Basis-Datei nicht gefunden: ${sourcePath}`)
        process.exit(1)
    }

    const sourceJson = JSON.parse(readFileSync(sourcePath, 'utf-8'))
    const entries = collectStrings(sourceJson, '')
    console.log(`📚 ${entries.length} übersetzbare Strings in ${sourceLang}.json gefunden.\n`)

    for (const lang of langs) {
        const outPath = join(ROOT, `src/i18n/locales/${lang}.json`)

        if (existsSync(outPath) && !force) {
            console.log(`⏭  ${lang}: ${outPath} existiert bereits (--force zum Überschreiben)`)
            continue
        }

        const displayName = LANGUAGE_INFO[lang]?.native ?? lang.toUpperCase()
        console.log(`🌍 Übersetze [${sourceLang} -> ${lang}] — ${displayName}`)

        // Übergebe hier sourceLang an die Übersetzungs-Schleife
        const translations = await translateAll(entries, lang, sourceLang)

        const result = JSON.parse(JSON.stringify(sourceJson)) as Record<string, unknown>
        for (const [path, translated] of translations) {
            setDeep(result, path, translated)
        }

        if (!dryRun) {
            writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', 'utf-8')
            console.log(`  ✓ ${outPath} erstellt`)
            patchI18nTs(lang)
            patchSettingsBar(lang)
        } else {
            console.log(`  [dry-run] würde ${outPath} erstellen und Projektdateien patchen.`)
        }
        console.log()
    }

    console.log('✅ Fertig!')
}

main().catch(err => {
    console.error('❌ Ein Fehler ist aufgetreten:', err instanceof Error ? err.message : err)
    process.exit(1)
})