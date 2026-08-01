// Supabase Edge Function: calendar
//
// Live-Proxy für die kalender.digital-ICS-Kalender. Ersetzt die zur Build-Zeit
// eingefrorenen Snapshots (/api/calendar*.ics) durch aktuelle Daten — der
// Streamplan veraltet damit nicht mehr zwischen zwei Deployments.
//
// Aufruf:  GET /functions/v1/calendar?url=<ics-url>
//
// Sicherheit: Es werden ausschließlich HTTPS-URLs von erlaubten Hosts geholt
// (Allowlist, Default: export.kalender.digital) — kein offener Proxy/SSRF.
// Weitere Hosts optional via Secret CALENDAR_ALLOWED_HOSTS (kommasepariert):
//   supabase secrets set CALENDAR_ALLOWED_HOSTS=export.kalender.digital,example.org

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

const DEFAULT_ALLOWED_HOSTS = ['export.kalender.digital']

function allowedHosts(): string[] {
  const extra = (Deno.env.get('CALENDAR_ALLOWED_HOSTS') ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
  return [...DEFAULT_ALLOWED_HOSTS, ...extra]
}

/** Erlaubt nur HTTPS-URLs, deren Host exakt auf der Allowlist steht. */
function parseAllowedUrl(raw: string | null): URL | null {
  if (!raw) return null
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  if (!allowedHosts().includes(url.hostname.toLowerCase())) return null
  return url
}

function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'GET') {
    return errorResponse('Method not allowed', 405)
  }

  const target = parseAllowedUrl(new URL(req.url).searchParams.get('url'))
  if (!target) {
    return errorResponse('Invalid or disallowed calendar url', 400)
  }

  try {
    const upstream = await fetch(target, { signal: AbortSignal.timeout(10_000) })
    if (!upstream.ok) {
      return errorResponse(`Upstream ${upstream.status}`, 502)
    }
    const text = await upstream.text()
    return new Response(text, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'text/calendar; charset=utf-8',
        // 5 Minuten Cache (CDN + Browser) — Kalenderdaten ändern sich selten,
        // und der Upstream wird so nicht für jeden Seitenaufruf getroffen.
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    })
  } catch (err) {
    console.error('calendar function failed', err)
    return errorResponse('Upstream fetch failed', 502)
  }
})
