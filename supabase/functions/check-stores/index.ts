// ==========================================
// Setup & Hilfsfunktionen
// ==========================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const NO_RESULTS_RE = /Keine Ergebnisse gefunden|Leider war die Suche erfolglos\.|0 Ergebnisse|0 results|no results|keine ergebnisse|Hier scheint nichts vorhanden zu sein\./i

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ==========================================
// Interfaces
// ==========================================
interface StoreResult {
  id: string
  labelKey: string
  url: string
  className: string
}

interface StoreProvider {
  id: string
  labelKey: string
  className: string
  getUrl: (gameName: string) => string
  check: (gameName: string, url: string) => Promise<boolean>
}

// ==========================================
// Standard HTML-Fallback-Check (deine alte Logik isoliert)
// ==========================================
async function fallbackHtmlCheck(gameName: string, url: string): Promise<boolean> {
  try {
    const res = await fetch(url)
    if (!res.ok) return false
    const html = await res.text()

    if (NO_RESULTS_RE.test(html)) {
      return false
    }

    const safeGameName = escapeRegExp(gameName)
    const nameExistsRegex = new RegExp(safeGameName, 'i')

    return nameExistsRegex.test(html)
  } catch (error) {
    console.error(`Fehler beim HTML-Check für ${url}:`, error)
    return false
  }
}

// ==========================================
// STORE PROVIDER
// ==========================================

const twitchProvider: StoreProvider = {
  id: 'twitch',
  labelKey: 'currentGame.stores.twitch',
  className: 'store-badge store-badge--twitch',
  getUrl: (gameName) => `https://www.twitch.tv/directory/game/${encodeURIComponent(gameName)}`,
  check: async () => true // Twitch gab in deinem alten Code immer true zurück
}

const steamProvider: StoreProvider = {
  id: 'steam',
  labelKey: 'currentGame.stores.steam',
  className: 'store-badge store-badge--steam',
  getUrl: (gameName) => `https://store.steampowered.com/search/?term=${encodeURIComponent(gameName)}`,
  check: async (gameName) => {
    // Steam: Saubere JSON-API
    try {
      const q = encodeURIComponent(gameName)
      const apiUrl = `https://store.steampowered.com/api/storesearch/?term=${q}&l=german&cc=de`
      const res = await fetch(apiUrl)
      if (!res.ok) return false
      const data = await res.json()
      return data.total > 0
    } catch (e) {
      console.error('Steam check failed:', e)
      return false
    }
  }
}

const epicProvider: StoreProvider = {
  id: 'epic',
  labelKey: 'currentGame.stores.epic',
  className: 'store-badge store-badge--epic',
  getUrl: (gameName) => `https://store.epicgames.com/browse?q=${encodeURIComponent(gameName)}`,
  check: fallbackHtmlCheck
}

const nintendoProvider: StoreProvider = {
  id: 'nintendo',
  labelKey: 'currentGame.stores.nintendo',
  className: 'store-badge store-badge--nintendo',
  getUrl: (gameName) => `https://www.nintendo.com/de-de/Suche-/Suche-299117.html?q=${encodeURIComponent(gameName)}`,
  check: fallbackHtmlCheck
}

const psstoreProvider: StoreProvider = {
  id: 'psstore',
  labelKey: 'currentGame.stores.psstore',
  className: 'store-badge store-badge--psstore',
  getUrl: (gameName) => `https://store.playstation.com/de-de/search/${encodeURIComponent(gameName)}`,
  check: fallbackHtmlCheck
}

const xboxProvider: StoreProvider = {
  id: 'xbox',
  labelKey: 'currentGame.stores.xbox',
  className: 'store-badge store-badge--xbox',
  getUrl: (gameName) => `https://www.xbox.com/de-DE/Search/Results?q=${encodeURIComponent(gameName)}`,
  check: fallbackHtmlCheck
}

// Alle Provider in einem Array sammeln
const providers: StoreProvider[] = [
  twitchProvider,
  steamProvider,
  epicProvider,
  nintendoProvider,
  psstoreProvider,
  xboxProvider
]

// ==========================================
// SUPABASE EDGE FUNCTION
// ==========================================

Deno.serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const gameName = body.gameName

    if (!gameName || typeof gameName !== 'string') {
      return new Response(JSON.stringify({ error: 'Valid gameName is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Alle Stores parallel abfragen
    const checkPromises = providers.map(async (provider) => {
      const targetUrl = provider.getUrl(gameName)
      const hasResult = await provider.check(gameName, targetUrl)

      if (hasResult) {
        return {
          id: provider.id,
          labelKey: provider.labelKey,
          className: provider.className,
          url: targetUrl
        } as StoreResult
      }
      return null
    })

    const results = await Promise.all(checkPromises)

    // Null-Werte (Stores ohne Treffer) filtern
    const visibleStores = results.filter((result): result is StoreResult => result !== null)

    return new Response(JSON.stringify({ visibleStores }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Edge Function Error:', error)
    // TypeScript Error Handling für Deno
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})