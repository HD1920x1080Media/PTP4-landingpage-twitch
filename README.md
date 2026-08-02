Supabase: https://supabase.com/dashboard/project/ashvqadctkccwnpaawqc

## Kontaktformular

Das Formular am Ende der Impressum-Seite postet an die Edge Function `contact`.
Die Function archiviert jede Nachricht in `contact_messages` und verschickt sie
per SMTP über GMX an `MAIL_TO`; `replyTo` ist die im Formular angegebene
Adresse, ein "Antworten" geht also direkt an den Absender.

### Vorbereitung im GMX-Konto

Unter Einstellungen → POP3/IMAP muss **"POP3 und IMAP Zugriff erlauben"**
aktiviert sein, sonst weist GMX die SMTP-Anmeldung ab. `MAIL_FROM` muss die
GMX-Adresse selbst oder ein dort eingerichteter Alias sein — fremde Absender
lehnt GMX mit Fehler 553 ab.

### Deploy

```bash
supabase link --project-ref <PROJECT_REF>

supabase secrets set \
  SMTP_USER=github-pipeline@gmx.de \
  SMTP_PASSWORD=<GMX_PASSWORT> \
  MAIL_FROM=github-pipeline@gmx.de \
  MAIL_TO=<ZIELADRESSE>

supabase db push
supabase functions deploy contact --no-verify-jwt
```

Server und Port stehen als Konstanten oben in
`supabase/functions/contact/index.ts` (`mail.gmx.net`, Port 465, implizites TLS).

`SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` stellt die Plattform in Edge
Functions automatisch bereit — die müssen nicht gesetzt werden.

`--no-verify-jwt` ist nötig, weil der Browser das Formular ohne Supabase-Key
abschickt. Missbrauch bremsen Honeypot und das IP-Rate-Limit (3 Requests pro
10 Minuten, Tabelle `contact_ratelimit`).

Hinweis: Die Supabase-Doku führt die SMTP-Ports 25/465/587 als gesperrt, in der
Praxis funktioniert der Versand über Port 465 mit TLS aber. Sollte es plötzlich
klemmen, ist der Wechsel auf einen HTTP-API-Anbieter (Resend, Postmark, Brevo)
der Ausweg — dann ist nur der `sendMail`-Block auszutauschen. Beachte ausserdem
die Sendelimits eines GMX-Freemail-Kontos.

### Zu ersetzende Platzhalter

| Platzhalter | Wo | Bedeutung |
| --- | --- | --- |
| `<PROJECT_REF>` | `supabase link` | Projekt-Ref aus der Dashboard-URL |
| `<GMX_PASSWORT>` | Secret `SMTP_PASSWORD` | Passwort des GMX-Kontos |
| `SMTP_USER` | Secret | GMX-Adresse zum Anmelden |
| `MAIL_FROM` | Secret | Absender, muss zum GMX-Konto gehören |
| `<ZIELADRESSE>` | Secret `MAIL_TO` | Postfach, in dem die Anfragen landen |
| `ALLOWED_ORIGINS` | `supabase/functions/contact/index.ts` | erlaubte Origins, aktuell `hd1920x1080.de` und `www.hd1920x1080.de` |

Im Frontend wird nur `VITE_SUPABASE_URL` benutzt (bereits in `.env`), es
liegt **kein** Supabase-Key im Client.
