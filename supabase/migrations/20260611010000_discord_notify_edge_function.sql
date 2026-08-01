-- ─────────────────────────────────────────────────────────────────────────────
-- Discord-Benachrichtigungen laufen jetzt über die Supabase Edge Function
-- discord-notify statt über den auf Render gehosteten DiscordBot.
--
-- schedule_discord_notify wird DB-seitig aufgerufen, sobald sich der Status
-- einer Voting-Runde ändert (vgl. clipvoting-Trigger/Cron). Statt an die alte
-- onrender.com-URL postet pg_net nun an die projekteigene Edge Function und
-- authentifiziert sich per x-webhook-secret (Pendant zum WEBHOOK_SECRET der
-- Function). Das Secret liegt im Vault unter 'discord_webhook_secret'.
--
-- SETUP (einmalig):
--   1. Function-Secret setzen (falls noch nicht geschehen):
--        supabase secrets set WEBHOOK_SECRET=<secret>
--   2. Gleiches Secret im Vault hinterlegen, damit die DB es senden kann:
--        SELECT vault.create_secret('<secret>', 'discord_webhook_secret');
--      (alten 'discord_api_key'-Eintrag kann man danach entfernen)
--
-- p_endpoint kommt historisch mit führendem Slash (z. B. '/start-runde-1') an;
-- die Edge Function erwartet den reinen Event-Namen als Query-Parameter.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION clipvoting.schedule_discord_notify(p_endpoint text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = clipvoting, public, net
AS $$
DECLARE
  v_secret text;
  v_event  text;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'discord_webhook_secret'
  LIMIT 1;

  IF v_secret IS NULL THEN
    RAISE WARNING 'discord_webhook_secret not found in vault';
    RETURN;
  END IF;

  -- Führenden Slash entfernen: '/start-runde-1' -> 'start-runde-1'
  v_event := ltrim(p_endpoint, '/');

  PERFORM net.http_post(
    url     := 'https://ashvqadctkccwnpaawqc.supabase.co/functions/v1/discord-notify?event=' || v_event,
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-webhook-secret', v_secret
    ),
    body    := '{}'::jsonb
  );
END;
$$;
