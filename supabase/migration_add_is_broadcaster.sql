-- Run this in the Supabase SQL Editor to add the missing column
ALTER TABLE moderators ADD COLUMN IF NOT EXISTS is_broadcaster boolean DEFAULT false;

-- Update the sync function to use the new column
CREATE OR REPLACE FUNCTION sync_moderators(p_mods jsonb, p_broadcaster_twitch_id text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_twitch_id   text;
  v_table_empty        boolean;
  v_count              integer;
  v_is_broadcaster     boolean;
  v_is_moderator       boolean;
  v_broadcaster_id     text;
BEGIN
  -- Twitch-ID des Aufrufers ermitteln
  SELECT coalesce(
    raw_user_meta_data->>'sub',
    raw_user_meta_data->>'provider_id'
  ) INTO v_caller_twitch_id
  FROM auth.users WHERE id = auth.uid();

  IF v_caller_twitch_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated', 'message', 'Benutzer nicht authentifiziert.');
  END IF;

  -- Broadcaster-ID aus Parameter oder aus der Liste der Mods (erste ID = Broadcaster)
  v_broadcaster_id := COALESCE(
    p_broadcaster_twitch_id,
    (p_mods->0->>'user_id')::text
  );

  -- Prüfen: Ist der Aufrufer der Broadcaster?
  v_is_broadcaster := (v_caller_twitch_id = v_broadcaster_id);

  -- Prüfen: Ist der Aufrufer ein Moderator?
  SELECT EXISTS(
    SELECT 1 FROM moderators WHERE twitch_user_id = v_caller_twitch_id
  ) INTO v_is_moderator;

  -- Entscheidungslogik:
  -- 1. Wenn Tabelle leer ist (Bootstrap): Jeder authentifizierte User darf synchronisieren
  -- 2. Wenn Aufrufer = Broadcaster: Erlauben
  -- 3. Wenn Aufrufer = Moderator: Erlauben
  -- Alles andere: Forbidden
  SELECT NOT EXISTS(SELECT 1 FROM moderators) INTO v_table_empty;

  IF NOT v_table_empty THEN
    IF NOT (v_is_broadcaster OR v_is_moderator) THEN
      RETURN jsonb_build_object(
        'error', 'forbidden',
        'message', 'Nur der Broadcaster oder Moderatoren dürfen die Moderatorenliste synchronisieren.'
      );
    END IF;
  END IF;

  -- Alle bisherigen Einträge entfernen und neu befüllen
  DELETE FROM moderators WHERE true;

  INSERT INTO moderators (twitch_user_id, display_name, is_broadcaster)
  SELECT
    (m->>'user_id')::text,
    (m->>'user_name')::text,
    ((m->>'user_id')::text = v_broadcaster_id)
  FROM jsonb_array_elements(p_mods) AS m
  ON CONFLICT (twitch_user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    is_broadcaster = EXCLUDED.is_broadcaster;

  SELECT count(*) INTO v_count FROM moderators;
  RETURN jsonb_build_object(
    'success', true,
    'count', v_count,
    'broadcaster_id', v_broadcaster_id,
    'caller_is_broadcaster', v_is_broadcaster
  );
END;
$$;
