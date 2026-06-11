# 🛠️ Setup-Anleitung – Twitch Streamer Landing Page

Dieses Repo ist ein vollständiger Baukasten für eine Twitch-Streamer-Landingpage.  
Alles Streamer-spezifische ist in **einer** Config-Datei (`src/config/siteConfig.ts`) und den **Sprachdateien** (`src/i18n/locales/de.json` etc.) konzentriert.

---

## Was du bekommst

| Modul | Enthalten | Anforderung |
|---|---|---|
| Landingpage (React, GitHub Pages) | ✅ | GitHub-Account |
| Streamplan (ICS-Kalender) | ✅ | kalender.digital-Account |
| Clip-Voting (Monat/Jahr) | ✅ | Supabase |
| OnlyBart (Premium-Bereich) | ✅ | Supabase + Twitch OAuth |
| Bartclicker-Spiel | ✅ | Supabase |
| Moderatoren-Dashboard | ✅ | Supabase + Twitch OAuth |
| Kanalpunkte-Bot + Extension | ✅ (TwitchAddon) | lokale EXE auf Streamer-PC |
| Discord-Benachrichtigungen | ✅ | Supabase Edge Function (empfohlen) **oder** DiscordBot auf Render (optional) |

---

## Schnellstart-Checkliste

Ohne Supabase läuft die Seite bereits als statische Linkpage auf GitHub Pages.  
Mit Supabase kommen Login, Voting, OnlyBart und das Bartclicker-Spiel dazu.

```
[ ] 1. Repo forken & klonen
[ ] 2. Links, Partner und Weiterleitungen in siteConfig.ts anpassen
[ ] 3. Bilder ersetzen (Profil, Logos)
[ ] 4. Twitch App erstellen → client_id + client_secret besorgen
[ ] 5. Supabase-Projekt erstellen → SQL-Migration ausführen
[ ] 6. GitHub Secrets eintragen
[ ] 7. GitHub Pages aktivieren
[ ] --
[ ] 8. (Optional) TwitchAddon konfigurieren
[ ] 9. (Optional) Discord Bot einrichten
```

---

## Schritt 1 – Repository forken & klonen

1. Klicke oben rechts auf **Fork**.
2. Klone dein Fork lokal:
   ```bash
   git clone https://github.com/DEIN-USERNAME/REPO-NAME.git
   cd REPO-NAME
   npm install
   ```
---

## Schritt 2 – `src/config/siteConfig.ts` vollständig anpassen

`siteConfig.ts` ist die **einzige Stelle** für alle Website-Daten.  
Öffne die Datei und passe alle markierten Bereiche an:

### 2a – Profil

```ts
profile: {
  name: 'DEIN_ANZEIGENAME',       // ← Name auf der Startseite
  subtitleKey: 'hero.subtitle',   // bleibt so (Text in de.json ändern)
  image: '/img/logos/HDProfile.webp', // ← dein Profilbild (Datei ersetzen)
},
```

### 2b – Twitch

```ts
twitch: {
  channel: (import.meta.env.VITE_CHANNEL_NAME as string), // ← via .env / GitHub Secret
  chatFallbackUrl: `https://www.twitch.tv/${...}/chat`,   // automatisch
  icsUrl: '/api/calendar.ics',    // bleibt so
  idLookupUrl: 'https://decapi.me/twitch/id/', // bleibt so
},
```

> Den Kanalname setzt du über die Umgebungsvariable `VITE_CHANNEL_NAME` (`.env` lokal, GitHub Secret in CI).

### 2c – Impressum (Pflichtangaben laut TMG)

```ts
impressum: {
  name: 'Dein Vollständiger Name',
  company: 'Deine Firma',         // leer lassen wenn kein Unternehmen
  street: 'Musterstraße 1',
  city: '12345 Musterstadt',
  email: 'kontakt@deinkanal.de',
},
```

### 2d – Streamplan

```ts
streamplan: {
  icsUrl: 'https://export.kalender.digital/ics/0/DEIN_TOKEN/deinkanal.ics',
  categories: [
    { id: 1, labelKey: 'streamplan.categories.gog',  url: '...ics-url...', color: '#d4af37' },
    // weitere Kategorien – IDs müssen 1, 2, 3, … sein (keine Lücken)
  ],
},
```

> Die ICS-URLs bekommst du von [kalender.digital](https://kalender.digital) nach dem Einloggen  
> unter **Kalender exportieren → ICS-Link**.

### 2e – Donations (StreamElements)

```ts
streamelements: {
  donationUrl: 'https://streamelements.com/DEIN_KANAL/tip',
},
```

> Die URL findest du in deinem [StreamElements-Dashboard](https://streamelements.com) unter **Tip Page**.

### 2f – Hauptlinks

```ts
links: [
  {
    titleKey: 'links.streamplan.title',
    descKey:  'links.streamplan.desc',
    url: '/streamplan',
    icon: '/img/logos/StreamPlan.webp',
    target: '_self',
  },
  // weitere Links …
],
```

Jeder Link kann folgende Felder haben:

| Feld | Bedeutung |
|---|---|
| `titleKey` | i18n-Schlüssel für den Titel (in `de.json` definieren) |
| `descKey` | i18n-Schlüssel für die Beschreibung (optional) |
| `url` | Ziel-URL oder interner Pfad (`/seite`) |
| `icon` | Pfad zu einem Bild in `public/` |
| `target` | `'_self'` (intern/gleicher Tab) oder `'_blank'` (extern) |
| `discountCode` | Wird angezeigt und beim Klick in die Zwischenablage kopiert |
| `downloadFile` | URL für Datei-Download (löst Download-Bestätigungsdialog aus) |
| `downloadName` | Dateiname für den Download |

Dasselbe Schema gilt für `games[]`, `clips[]` und `partners[]`.

### 2g – Partner mit Rabattcodes

```ts
partners: [
  {
    titleKey: 'partners.beispiel.title',
    descKey:  'partners.beispiel.desc',
    url: 'https://beispiel.shop/?ref=deinkanal',
    icon: '/img/logos/Beispiel.webp',
    target: '_blank',
    discountCode: 'DEINCODE',   // ← wird beim Klick kopiert
  },
],
```

### 2h – Kurz-URLs (Weiterleitungen)

```ts
redirects: {
  '/discord':   'https://discord.gg/DEIN_INVITE',
  '/instagram': 'https://www.instagram.com/DEIN_KANAL/',
  '/yt':        'https://youtube.com/@DEIN_KANAL',
  // …
},
```

### 2i – Design & Branding

```ts
accentColor: '#7C4DFF',        // ← deine Markenfarbe (Hex)
copyrightHolder: 'Deine Firma',
onlyBart: {
  title: 'OnlyBart',           // ← Name deines Premium-Bereichs
  logoUrl: '/img/logos/OB.webp',
},
```

---

## Schritt 3 – Sprachdateien anpassen

Streamer-spezifische Texte in einer Sprachdatei (z.B.) `src/i18n/locales/de.json` anpassen.
Für die Unterstützung weiterer Sprachen in Anschluss: 
```bash 
npm run translate -- --sl de fr es
```

Optionen:
--sl <lang> Quellsprache definieren (Default: de)
--force     Bereits vorhandene JSON-Dateien überschreiben

| Schlüssel | Bedeutung | Beispielwert |
|---|---|---|
| `hero.subtitle` | Tagline unter deinem Namen | `"Gaming, Streams & Clips"` |
| `links.onlybart.title` | Name des Premium-Bereichs | `"OnlyBart"` |
| `links.onlybart.desc` | Kurzbeschreibung | `"Exklusive Inhalte"` |
| `streamplan.categories.*` | Kategorie-Labels | `"Just Chatting"` |
| `notFound.confusedMessages` | 404-Humor-Texte | beliebig |
| `onlybart.accessDenied.message` | Text wenn kein Zugang | eigene Formulierung |
| `partners.*.title/desc` | Partner-Texte | `"10% Rabatt mit Code …"` |
| `bartclickerPage.description` | Spielbeschreibung | eigene Formulierung |

> **Hinweis:** Die Schlüssel müssen mit den `titleKey`/`descKey`-Werten in `siteConfig.ts` übereinstimmen.

---

## Schritt 4 – Bilder ersetzen

Ersetze die folgenden Dateien in `public/img/logos/` durch deine eigenen (Format beibehalten):

| Datei | Verwendung |
|---|---|
| `HDProfile.webp` | Profilbild auf der Startseite |
| `OB.webp` | Premium-Bereich Logo |
| `StreamPlan.webp` | Streamplan-Link-Karte |
| `StreamElements.webp` | StreamElements-Link-Karte |
| `cdm.webp` | Clip-des-Monats-Link-Karte |
| `NClip.webp`, `Frugends.webp`, `Evolve.webp` | Partner-Logos (ersetzen oder entfernen) |
| `../logo128.png` | App-Icon / Favicon |

SVG-Dateien (`discord.svg`, `youtube.svg`, etc.) können so bleiben oder durch eigene ersetzt werden.

---

## Schritt 5 – Twitch App & Credentials

### 5a – Twitch Developer App erstellen

1. Gehe zu [dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps)
2. Klicke auf **„Register Your Application"**
3. Fülle aus:
   - **Name:** beliebig (z.B. „MeinKanal Landing Page")
   - **OAuth Redirect URLs:** `https://DEIN-SUPABASE-PROJEKT.supabase.co/auth/v1/callback`  
     (die URL bekommst du nach Schritt 6 aus Supabase)
   - **Category:** Website Integration
4. Klicke **Create**
5. Notiere **Client ID** und generiere einen **Client Secret**

### 5b – OAuth Refresh Token generieren

Der Bot und die GitHub Actions brauchen einen Refresh Token mit bestimmten Scopes.  
Am einfachsten mit der [Twitch CLI](https://dev.twitch.tv/docs/cli/):

```bash
# Twitch CLI installieren (Windows: winget install Twitch.TwitchCLI)
twitch token -u -s "channel:read:subscriptions moderation:read channel:manage:moderators channel:read:redemptions chat:read chat:edit"
```

Alternativ: [twitchtokengenerator.com](https://twitchtokengenerator.com) – dort die gleichen Scopes auswählen.

> Das Tool gibt `access_token` und `refresh_token` aus.  
> Du brauchst den **refresh_token** (der access_token läuft schnell ab, der Bot erneuert ihn automatisch).

---

## Schritt 6 – Supabase einrichten

### 6a – Projekt erstellen

1. Gehe zu [supabase.com](https://supabase.com) und erstelle ein kostenloses Projekt
2. Notiere nach der Erstellung:
   - **Project URL** (`https://xxx.supabase.co`)
   - **anon / public Key** (Settings → API → Project API keys → `anon`)
   - **service_role Key** (Settings → API → Project API keys → `service_role`) ⚠️ geheim halten

### 6b – Datenbankschema einrichten

Führe **alle** Dateien aus `supabase/migrations/` in zeitlicher Reihenfolge
(Dateiname = Zeitstempel) aus:

1. Öffne das **SQL Editor**-Tab in deinem Supabase-Projekt
2. Führe die Migrationen von der ältesten zur neuesten aus — beginnend mit
   `20260424134835_remote_schema.sql`

Alternativ mit der Supabase CLI in einem Schritt: `supabase db push`

> Diese Dateien erstellen alle nötigen Tabellen (`votes`, `bartclicker_scores`, `points`, `rewards`,  
> `onlybart_posts`, `page_views`, etc.), setzen Row Level Security (RLS) Policies und
> die Anti-Cheat-RPCs (`cast_vote`, `save_bartclicker_state`).

### 6c – Twitch OAuth aktivieren

1. Gehe in Supabase zu **Authentication → Providers → Twitch**
2. Aktiviere Twitch und trage ein:
   - **Client ID** → deine Twitch App Client ID
   - **Client Secret** → dein Twitch App Secret
3. Kopiere die **Redirect URL** (z.B. `https://xxx.supabase.co/auth/v1/callback`)
4. Trage diese URL in deiner Twitch App unter **OAuth Redirect URLs** ein

### 6d – Edge Functions deployen

Die Edge Functions liegen in `supabase/functions/` — alle optional, die Seite
fällt ohne sie auf statische Daten bzw. Drittanbieter zurück:

| Function | Zweck | Ohne sie |
|---|---|---|
| `twitch-game` | Aktuell gespieltes Spiel während des Streams | keine Spielinfo |
| `check-stores` | Store-Links (Steam, Epic, …) zum aktuellen Spiel | keine Store-Badges |
| `calendar` | **Live**-Streamplan (ICS-Proxy zu kalender.digital) | Streamplan = Stand des letzten Deployments |
| `twitch-user` | Username→ID-Lookup im Mod-Dashboard via Twitch-API | Fallback auf decapi.me (Drittanbieter) |
| `discord-notify` | Discord-Voting-Benachrichtigungen (siehe Anhang C) | Render-DiscordBot nötig |

```bash
# Supabase CLI installieren: https://supabase.com/docs/guides/cli
supabase login
supabase link --project-ref DEIN_PROJEKT_REF

# Twitch-Credentials als Function-Secrets (für twitch-game UND twitch-user)
supabase secrets set TWITCH_CLIENT_ID=... TWITCH_CLIENT_SECRET=... TWITCH_CHANNEL=deinkanal

supabase functions deploy twitch-game
supabase functions deploy check-stores
supabase functions deploy calendar
supabase functions deploy twitch-user
```

> `calendar` proxied nur HTTPS-URLs von `export.kalender.digital` (Allowlist).  
> Nutzt du einen anderen Kalender-Anbieter:  
> `supabase secrets set CALENDAR_ALLOWED_HOSTS=dein-anbieter.de`

---

## Schritt 7 – GitHub Secrets & Pages

### 7a – Secrets eintragen

Gehe zu: **Repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret | Woher | Pflicht |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase → Settings → API → Project URL | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon key | ✅ |
| `VITE_TWITCH_CLIENT_ID` | Twitch Developer Console → App → Client ID | ✅ |
| `CHANNEL_NAME` | Dein Twitch-Kanalname (Kleinbuchstaben) | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key | ✅ |
| `TWITCH_CLIENT_SECRET` | Twitch Developer Console → App → Client Secret | ✅ |
| `TWITCH_REFRESH_TOKEN` | Aus Schritt 6b (Token-Generator) | ✅ |
| `GH_TOKEN` | GitHub → Settings → Developer settings → Personal access tokens (Scopes: `secrets:write`) | ✅ (für Token-Refresh) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key | ✅ |
| `NGROK_AUTHTOKEN` | ngrok Authtoken (Dashboard → "Your Authtoken") | nur mit TwitchAddon |
| `NGROK_DOMAIN` | reservierte Static-Domain, z.B. `dein-name.ngrok-free.app` | nur mit TwitchAddon |
| `EXTENSION_CLIENT_ID` | Twitch Extension Client ID | nur mit Extension |
| `EXTENSION_SECRET` | Twitch Extension Secret (Base64) | nur mit Extension |

### 7b – GitHub Pages aktivieren

1. Gehe zu: **Repo → Settings → Pages**
2. Wähle bei **Source**: **„GitHub Actions"**
3. Beim nächsten Push auf `master`/`main` wird die Seite automatisch gebaut und deployt.

### 7c – Base-URL in `vite.config.ts` prüfen

**Mit Custom Domain** (z.B. `meinkanal.de`): Keine Änderung nötig, `base: '/'` ist korrekt.

**Ohne Custom Domain** (GitHub Pages URL: `https://USERNAME.github.io/REPO-NAME/`):

```ts
// vite.config.ts, Zeile ~165
base: '/REPO-NAME/',   // ← Repo-Namen eintragen
```

Custom Domain in GitHub Pages setzen: **Settings → Pages → Custom domain**.

---

## Schritt 8 – Workflows aktivieren

Die GitHub Actions unter `.github/workflows/` laufen automatisch, sobald die Secrets gesetzt sind:

| Workflow | Was er tut | Trigger |
|---|---|---|
| `deploy.yml` | Baut und deployt die Landingpage | Push auf master/main |
| `twitch-sync.yml` | Synchronisiert Twitch-Daten, erneuert den Refresh Token | Alle 2 Stunden |
| `fetch-clips.yml` | Holt Top-Clips von Twitch, startet Voting-Runde 1 | 22. des Monats, 00:23 UTC |
| `manage-rounds.yml` | Verwaltet Voting-Runden-Status automatisch | Täglich 06:00 UTC |
| `build.yml` | Baut TwitchAddon als EXE und ZIP | Push auf master/main |
| `docker.yml` | Baut Docker-Images und pusht nach ghcr.io | Push auf master/main |

> `fetch-clips.yml` und `manage-rounds.yml` können auch manuell ausgelöst werden  
> (Actions → Workflow → **Run workflow**).

---

## Anhang A – TwitchAddon (Kanalpunkte-Bot + Extension)

Der TwitchAddon ist der Kanalpunkte-Bot und stellt die Twitch Panel Extension bereit.
Er läuft **lokal auf dem Streamer-PC** als selbst-gepackte EXE (~40–60 MB RAM) und
öffnet beim Start automatisch einen ngrok-Tunnel mit fester Domain — kein Server,
kein Hosting, keine manuelle Konfiguration.

### Einmaliges Setup (Dev)

1. Konto auf [ngrok.com](https://ngrok.com) anlegen.
2. Im Dashboard unter **Cloud Edge → Domains** eine Static-Domain reservieren
   (im Free-Plan ist eine Domain enthalten, z.B. `dein-name.ngrok-free.app`).
3. **Authtoken** kopieren (Dashboard → "Your Authtoken").
4. In den GitHub-Secrets eintragen:
   - `NGROK_AUTHTOKEN` = der Authtoken
   - `NGROK_DOMAIN` = die reservierte Domain (ohne `https://`-Präfix)
5. In der Twitch-Extension (siehe Anhang B) die Allowlist setzen:
   **Capabilities → Allowlist for URLs Fetched by the Frontend** → `https://<NGROK_DOMAIN>`

Das war's an Setup. Bei jedem Push auf `master` baut die Pipeline `TwitchAddon-Release.zip`
mit `TwitchAddon.exe`, `ngrok.exe`, `.env` und `overlay.html` darin.

### Streamer-Nutzung

1. ZIP entpacken in einen festen Ordner.
2. `TwitchAddon.exe` doppelklicken — fertig.

Die EXE startet den lokalen HTTP-Server auf Port 8081, öffnet den ngrok-Tunnel
auf die feste Domain und vergibt Zuschauern Punkte. Wenn der Streamer offline ist
oder die EXE nicht läuft, zeigt die Extension automatisch eine Offline-Meldung an.

### Lokal ohne EXE (Dev)

```bash
cd TwitchAddon
cp .env.example .env
# .env mit deinen Werten befüllen (inkl. NGROK_AUTHTOKEN/NGROK_DOMAIN)
bun install
bun run index.ts
```

Ohne `NGROK_*`-Variablen läuft der Server nur unter `http://localhost:8081` —
nützlich für Tests, aber die Twitch-Extension erreicht ihn dann nicht.

**Vollständige Anleitung:** [TwitchAddon/SETUP.md](TwitchAddon/SETUP.md)

---

## Anhang B – Twitch Extension einrichten

Nur nötig wenn du die Panel Extension im Twitch-Kanal anzeigen willst.

1. Gehe zu [dev.twitch.tv/console/extensions](https://dev.twitch.tv/console/extensions)
2. **Create Extension** → Typ: `Panel`
3. **Testing Base URI** = `https://<NGROK_DOMAIN>` (die in den Secrets hinterlegte Static-Domain)
4. Pfade eintragen:

| Feld | Wert |
|---|---|
| Panel Viewer Path | `/extension/panel.html` |
| Config Path | `/extension/config.html` |
| Mobile Path | `/extension/mobile.html` |

5. **Extension Client ID** und **Extension Secret** in `.env` / GitHub Secrets eintragen
6. Extension im Creator Dashboard aktivieren: **Extensions → Meine Extensions → Als Panel aktivieren**

---

## Anhang C – Discord-Benachrichtigungen (optional)

Postet automatische Nachrichten wenn Voting-Runden starten oder enden,  
ausgelöst durch Supabase Webhooks. Zwei Wege:

- **Empfohlen: Edge Function `discord-notify`** — serverlos, kein Hosting nötig.
- **Alternative: DiscordBot auf Render** — der bisherige Weg, bleibt unterstützt.

### Bot erstellen (für beide Wege)

1. Gehe zu [discord.com/developers/applications](https://discord.com/developers/applications)
2. **New Application** → Bot-Tab → **Add Bot**
3. Lade den Bot in deinen Server ein (Berechtigungen: `Send Messages`, `View Channels`)
4. Notiere den **Bot Token** und die **Channel ID** des Ziel-Kanals

> Die Gateway-Intents (Server Members / Message Content) braucht nur der
> Render-Bot — die Edge Function sendet rein über die REST-API.

### Weg 1 – Edge Function `discord-notify` (empfohlen)

```bash
# Secrets setzen (WEBHOOK_SECRET frei wählen, z.B. via Passwort-Generator)
supabase secrets set DISCORD_TOKEN=... DISCORD_CHANNEL_ID=... WEBHOOK_SECRET=...
supabase secrets set VOTING_URL=https://deinkanal.de/clipdesmonats   # optional

# Webhooks senden kein Supabase-JWT → verify_jwt aus; Schutz übernimmt WEBHOOK_SECRET
supabase functions deploy discord-notify --no-verify-jwt
```

Dann Supabase-Webhooks anlegen (Database → Webhooks → **New Webhook**):

- **URL:** `https://DEIN-PROJEKT.supabase.co/functions/v1/discord-notify?event=start-runde-1`  
  (pro Event ein Webhook: `start-runde-1`, `ende-runde-1`, `start-runde-2`, `ende-runde-2`, `start-jahr`, `ende-jahr`)
- **HTTP Header:** `x-webhook-secret: <dein WEBHOOK_SECRET>`
- **Events:** z.B. `UPDATE` auf Tabelle `voting_rounds`

### Weg 2 – DiscordBot auf Render (Alternative)

1. Erstelle ein Konto auf [render.com](https://render.com)
2. New **Web Service** → verbinde dein GitHub-Repo → Root Directory: `DiscordBot`
3. Build Command: `npm install && npm run build`  
   Start Command: `npm start`
4. Env-Variablen eintragen:

| Variable | Bedeutung |
|---|---|
| `DISCORD_TOKEN` | Discord Bot Token |
| `CHANNEL_ID` | Discord Kanal-ID |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key (als API-Key-Auth) |
| `PORT` | `3000` (Render setzt das automatisch) |

5. Notiere die Render-URL und konfiguriere Supabase-Webhooks:
   - Supabase → Database → Webhooks → **New Webhook**
   - Events: z.B. `UPDATE` auf Tabelle `voting_rounds`
   - Webhook URL: `https://DEINE-RENDER-URL/start-runde-1` (je nach Event)

### Lokal

```bash
cd DiscordBot
cp .env.example .env   # (Datei selbst anlegen mit den obigen Variablen)
npm install
npm start
```

---

## Komplette GitHub Secrets Referenz

| Secret | Pflicht | Beschreibung |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Supabase Project URL (`https://xxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service_role key (Admin-Rechte) |
| `VITE_TWITCH_CLIENT_ID` | ✅ | Twitch App Client ID |
| `TWITCH_CLIENT_SECRET` | ✅ | Twitch App Client Secret |
| `TWITCH_REFRESH_TOKEN` | ✅ | Twitch OAuth Refresh Token (Scopes: chat, moderation, subscriptions, redemptions) |
| `CHANNEL_NAME` | ✅ | Twitch-Kanalname (Kleinbuchstaben, ohne @) |
| `GH_TOKEN` | ✅ | GitHub Personal Access Token (Scope: `secrets:write`) – für automatischen Token-Refresh |
| `NGROK_AUTHTOKEN` | TwitchAddon | ngrok Authtoken — die EXE öffnet damit automatisch den Tunnel |
| `NGROK_DOMAIN` | TwitchAddon | reservierte Static-Domain (z.B. `dein-name.ngrok-free.app`) |
| `EXTENSION_CLIENT_ID` | Extension | Client ID der Twitch Extension |
| `EXTENSION_SECRET` | Extension | Base64-kodiertes Extension Secret |

---

## Troubleshooting

| Problem | Lösung |
|---|---|
| Build schlägt fehl: `VITE_CHANNEL_NAME is undefined` | Secret `CHANNEL_NAME` in GitHub Actions setzen |
| Twitch Login funktioniert nicht | Redirect URL in Twitch App prüfen; muss mit Supabase-Callback übereinstimmen |
| Clip-Voting lädt nicht | Supabase-Migration ausführen (Schritt 7b) |
| Streamplan leer | `streamplan.icsUrl` in `siteConfig.ts` prüfen; kalender.digital-URL muss öffentlich sein |
| 404 bei direktem Aufruf von `/streamplan` etc. | GitHub Pages SPA-Fallback aktiv? `dist/404.html` muss existieren (wird automatisch erstellt) |
| GitHub Pages zeigt alten Stand | Actions → Deploy to GitHub Pages → Re-run |
| TwitchAddon startet nicht | `bun --version` prüfen; `.env` vollständig befüllt? |
| Extension zeigt "Streamer offline" obwohl der Streamer live ist | TwitchAddon.exe läuft? Logfenster der EXE prüfen — dort steht die ngrok-URL. Falls fehlend: `NGROK_AUTHTOKEN`/`NGROK_DOMAIN` in `.env` neben der EXE setzen. |
| Extension lädt gar keine Daten | `NGROK_DOMAIN` muss in der Twitch-Extension-Allowlist (Capabilities → URLs Fetched by Frontend) eingetragen sein |
| Twitch Refresh Token abgelaufen | `twitch-sync.yml` Workflow manuell ausführen oder neuen Token aus Schritt 6b generieren |
| `rpc_missing`-Fehler im Moderatoren-Dashboard | SQL-Migration noch nicht ausgeführt → Schritt 7b wiederholen |
| `base: '/'` in vite.config.ts falsch | Ohne Custom Domain: `base: '/REPO-NAME/'` setzen |
