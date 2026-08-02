-- ─────────────────────────────────────────────────────────────────────────────
-- Kontaktformular (Impressum-Seite)
--
-- contact_messages   Archiv aller eingegangenen Nachrichten. Wird auch dann
--                    befuellt, wenn der anschliessende Mailversand scheitert —
--                    so geht keine Anfrage verloren.
-- contact_ratelimit  Ein Datensatz je Request; die Edge Function zaehlt daraus
--                    die Requests einer IP im Zeitfenster.
--
-- Zugriff ausschliesslich ueber den Service Role Key der Edge Function:
-- RLS ist aktiv, es gibt bewusst KEINE Policies. Damit sind anon und
-- authenticated komplett ausgesperrt; die Service Role umgeht RLS ohnehin.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  name        text        NOT NULL,
  email       text        NOT NULL,
  message     text        NOT NULL,
  ip          text
);

CREATE TABLE IF NOT EXISTS public.contact_ratelimit (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  ip          text        NOT NULL
);

-- Archiv wird chronologisch gelesen; Rate-Limit fragt immer (ip, Zeitfenster).
CREATE INDEX IF NOT EXISTS contact_messages_created_at_idx
  ON public.contact_messages (created_at DESC);

CREATE INDEX IF NOT EXISTS contact_ratelimit_ip_created_at_idx
  ON public.contact_ratelimit (ip, created_at DESC);

ALTER TABLE public.contact_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_ratelimit ENABLE ROW LEVEL SECURITY;

-- Explizit: keine Rechte fuer die REST-Rollen. RLS ohne Policy blockt bereits,
-- der REVOKE nimmt zusaetzlich das Tabellen-Grant weg (Defense in Depth).
REVOKE ALL ON public.contact_messages  FROM anon, authenticated;
REVOKE ALL ON public.contact_ratelimit FROM anon, authenticated;
