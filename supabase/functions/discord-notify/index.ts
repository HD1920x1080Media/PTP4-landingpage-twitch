// Supabase Edge Function: discord-notify
//
// Postet die Voting-Benachrichtigungen direkt in einen Discord-Channel —
// als serverloser Ersatz für den auf Render gehosteten DiscordBot. Discord
// braucht für reine Channel-Nachrichten keinen Gateway-Bot, ein REST-Call
// mit dem Bot-Token genügt.
//
// Aufruf (durch Supabase Database Webhooks):
//   POST /functions/v1/discord-notify?event=start-runde-1
//   Header: x-webhook-secret: <WEBHOOK_SECRET>
// Alternativ kann das Event im JSON-Body stehen: { "event": "start-runde-1" }
//
// Deployment (Webhooks senden kein Supabase-JWT → verify_jwt aus, Schutz
// übernimmt der Secret-Header):
//   supabase functions deploy discord-notify --no-verify-jwt
//   supabase secrets set DISCORD_TOKEN=... DISCORD_CHANNEL_ID=... WEBHOOK_SECRET=...
//   supabase secrets set VOTING_URL=https://deinkanal.de/clipdesmonats   # optional

const VOTING_URL = Deno.env.get('VOTING_URL') ?? 'https://hd1920x1080.de/clipdesmonats'

// Spiegel der Nachrichten aus DiscordBot/lib.ts — gleiche Events, gleiche Texte.
const MESSAGES: Record<string, string> = {
  'start-runde-1': `🚀 **Clip des Monats Runde 1 hat begonnen!** Jetzt abstimmen! ${VOTING_URL}`,
  'ende-runde-1': `🏁 **Clip des Monats Runde 1 ist beendet.** Die Ergebnisse werden ausgewertet! ${VOTING_URL}`,
  'start-runde-2': `🔥 **Clip des Monats Runde 2 startet jetzt!** Hier abstimmen und die besten Clips küren! ${VOTING_URL}`,
  'ende-runde-2': `🛑 **Clip des Monats Runde 2 ist vorbei.** Vielen Dank fürs Mitmachen! ${VOTING_URL}`,
  'start-jahr': `🌟 **Das Clip des Jahres Voting beginnt!** Ein Rückblick der Superlative. ${VOTING_URL}`,
  'ende-jahr': `🏆 **Das Clip des Jahres Voting ist abgeschlossen!** Die Legenden stehen fest. ${VOTING_URL}`,
}

/**
 * Konstant-zeitiger Secret-Vergleich: beide Werte werden gehasht und die
 * Digests verglichen. Ein Angreifer kann ohne Kenntnis des Secrets keine
 * gezielten Präfix-Kollisionen der Hashes erzeugen — Timing verrät nichts.
 */
async function secretMatches(provided: string, expected: string): Promise<boolean> {
  const enc = new TextEncoder()
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(provided)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ])
  const av = new Uint8Array(a)
  const bv = new Uint8Array(b)
  let diff = 0
  for (let i = 0; i < av.length; i++) diff |= av[i] ^ bv[i]
  return diff === 0
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const webhookSecret = Deno.env.get('WEBHOOK_SECRET')
  const token = Deno.env.get('DISCORD_TOKEN')
  const channelId = Deno.env.get('DISCORD_CHANNEL_ID')
  if (!webhookSecret || !token || !channelId) {
    console.error('discord-notify: WEBHOOK_SECRET, DISCORD_TOKEN oder DISCORD_CHANNEL_ID fehlt')
    return jsonResponse({ error: 'Not configured' }, 500)
  }

  const provided = req.headers.get('x-webhook-secret') ?? ''
  if (!provided || !(await secretMatches(provided, webhookSecret))) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  // Event aus Query-Param oder JSON-Body lesen
  let event = new URL(req.url).searchParams.get('event') ?? ''
  if (!event) {
    const body = await req.json().catch(() => null) as { event?: string } | null
    event = body?.event ?? ''
  }

  const message = MESSAGES[event]
  if (!message) {
    return jsonResponse({ error: 'Unknown event', known: Object.keys(MESSAGES) }, 400)
  }

  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: message }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error(`discord-notify: Discord API ${res.status}`, detail)
      return jsonResponse({ error: `Discord API ${res.status}` }, 502)
    }
    return jsonResponse({ status: 'Gesendet', event })
  } catch (err) {
    console.error('discord-notify failed', err)
    return jsonResponse({ error: 'Discord request failed' }, 502)
  }
})
