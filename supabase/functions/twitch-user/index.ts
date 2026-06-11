// Supabase Edge Function: twitch-user
//
// Twitch-Username → User-ID-Lookup über die offizielle Helix-API.
// Ersetzt den Drittanbieter decapi.me (Privatsphäre + Verfügbarkeit):
// Moderatoren-Eingaben verlassen damit nicht mehr das eigene Projekt.
//
// Aufruf:  GET /functions/v1/twitch-user?login=<name>
// Antwort: { id, login, display_name }  bzw. 404 wenn unbekannt.
//
// Nutzt dieselben Supabase-Secrets wie die twitch-game-Funktion:
//   supabase secrets set TWITCH_CLIENT_ID=... TWITCH_CLIENT_SECRET=...

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

interface TokenResponse {
  access_token: string
  expires_in: number
}

interface HelixUser {
  id: string
  login: string
  display_name: string
}

let cachedToken: { token: string; expiresAt: number } | null = null

async function getAppToken(clientId: string, clientSecret: string): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token
  }
  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  })
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`)
  const data = (await res.json()) as TokenResponse
  // 60 Sekunden Sicherheitspuffer vor dem tatsächlichen Ablauf
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }
  return cachedToken.token
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const login = (new URL(req.url).searchParams.get('login') ?? '').trim().toLowerCase()
  // Twitch-Logins: 1–25 Zeichen, alphanumerisch + Unterstrich
  if (!/^[a-z0-9_]{1,25}$/.test(login)) {
    return jsonResponse({ error: 'Invalid login' }, 400)
  }

  const clientId = Deno.env.get('TWITCH_CLIENT_ID')
  const clientSecret = Deno.env.get('TWITCH_CLIENT_SECRET')
  if (!clientId || !clientSecret) {
    return jsonResponse({ error: 'Twitch credentials not configured' }, 500)
  }

  try {
    const token = await getAppToken(clientId, clientSecret)
    const res = await fetch(
      `https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`,
      {
        headers: { Authorization: `Bearer ${token}`, 'Client-Id': clientId },
        signal: AbortSignal.timeout(10_000),
      },
    )
    if (!res.ok) throw new Error(`Users API ${res.status}`)

    const data = (await res.json()) as { data: HelixUser[] }
    const user = data.data?.[0]
    if (!user) {
      return jsonResponse({ error: 'User not found' }, 404)
    }
    return jsonResponse({ id: user.id, login: user.login, display_name: user.display_name })
  } catch (err) {
    console.error('twitch-user function failed', err)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})
