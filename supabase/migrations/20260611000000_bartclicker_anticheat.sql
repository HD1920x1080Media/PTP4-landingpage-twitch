-- ─────────────────────────────────────────────────────────────────────────────
-- Bartclicker Anti-Cheat: Spielstände werden nur noch über die validierende
-- RPC save_bartclicker_state geschrieben (gleiches Muster wie cast_vote /
-- redeem_reward). Die bisherigen insert_self/update_self-Policies erlaubten
-- jedem eingeloggten User, beliebige Werte (total_ever = Leaderboard-Score!)
-- direkt per REST zu schreiben.
--
-- WICHTIG — Deploy-Reihenfolge: Diese Migration erst zusammen mit dem
-- Frontend-Stand ausrollen, der saveGameState über die RPC abwickelt.
-- Ein älteres Frontend kann nach dieser Migration nicht mehr speichern.
--
-- Validierungs-Strategie (bewusst konservativ, keine False-Positives):
--   REJECT  bei strukturell unmöglichen Zuständen (Invarianten):
--           - energy > total_ever        (man kann nicht mehr besitzen als je verdient)
--           - total_ever sinkt           (Lebenszeit-Zähler ist monoton)
--           - Items/Relikte teurer als total_ever hergibt (Untergrenze, Faktor 0.5)
--   CLAMP   bei zu schnellem Wachstum: Zuwachs pro Speicher-Fenster wird auf
--           Zeit × (CPS + Klickleistung) des LETZTEN Spielstands begrenzt
--           (großzügige Sicherheitsfaktoren für Buffs/Relikte/Käufe im Fenster).
--           Legitime Spieler bleiben weit unter der Grenze; Cheater werden auf
--           die Wachstumskurve eines optimalen Bots gedrückt.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.save_bartclicker_state(
  p_energy                       numeric,
  p_total_ever                   numeric,
  p_rebirth_count                integer,
  p_shop_items                   jsonb,
  p_active_buffs                 jsonb,
  p_active_debuffs               jsonb,
  p_relics                       jsonb,
  p_offline_earning_upgrades     integer,
  p_auto_click_buyer_enabled     boolean,
  p_auto_click_buyer_unlocked    boolean,
  p_click_upgrade_buyer_enabled  boolean,
  p_click_upgrade_buyer_unlocked boolean,
  p_click_upgrade_buyer_items    jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      uuid;
  v_old          public.bartclicker_scores%ROWTYPE;
  v_elapsed      numeric;
  v_cps_old      numeric := 0;
  v_click_old    numeric := 0;
  v_capacity     numeric;
  v_gain_max     numeric;
  v_total_ever   numeric := p_total_ever;
  v_energy       numeric := p_energy;
  v_clamped      boolean := false;
  v_spent_min    numeric := 0;
  v_item         jsonb;
  v_count        numeric;
  v_base         numeric;
  v_cps          numeric;
  v_click        numeric;
  v_relic_cost   numeric;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  -- ── Strukturelle Validierung ──
  -- Erst Typen prüfen (eigener IF-Block: Postgres garantiert in einem
  -- OR-Ausdruck keine Auswertungsreihenfolge, jsonb_array_length auf einem
  -- Nicht-Array würde sonst eine Exception statt der Fehlerantwort werfen).
  IF p_energy IS NULL OR p_total_ever IS NULL OR p_rebirth_count IS NULL
     OR p_offline_earning_upgrades IS NULL
     OR jsonb_typeof(p_shop_items)  IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_active_buffs) IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_active_debuffs) IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_relics) IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_click_upgrade_buyer_items) IS DISTINCT FROM 'array'
  THEN
    RETURN jsonb_build_object('error', 'invalid_state');
  END IF;

  IF p_energy < 0 OR p_total_ever < 0
     OR p_energy = 'NaN'::numeric OR p_total_ever = 'NaN'::numeric
     OR p_rebirth_count < 0 OR p_rebirth_count > 500
     OR p_offline_earning_upgrades < 0 OR p_offline_earning_upgrades > 8
     OR jsonb_array_length(p_shop_items) > 64
     OR jsonb_array_length(p_relics) > 16
     OR jsonb_array_length(p_active_buffs) > 32
     OR jsonb_array_length(p_active_debuffs) > 32
     OR pg_column_size(p_shop_items) > 65536
     OR pg_column_size(p_relics) > 16384
     OR pg_column_size(p_active_buffs) > 16384
     OR pg_column_size(p_active_debuffs) > 16384
     OR pg_column_size(p_click_upgrade_buyer_items) > 4096
  THEN
    RETURN jsonb_build_object('error', 'invalid_state');
  END IF;

  -- Invariante 1: Man kann nicht mehr Energie besitzen, als man je verdient hat.
  IF p_energy > p_total_ever THEN
    RETURN jsonb_build_object('error', 'invalid_state');
  END IF;

  -- Invariante 2 (Bezahlbarkeit): Aktuelle Items/Relikte müssen aus total_ever
  -- bezahlbar gewesen sein. Untergrenze der Ausgaben (ohne Rebirth-Preisskalierung,
  -- Faktor 0.5 als Sicherheitsmarge gegen Rundungs-/Formelabweichungen):
  --   Item-Kosten:  base × (1.15^count − 1) / 0.15
  --   Relikt-Kosten: feste Freischaltpreise
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_shop_items)
  LOOP
    v_count := LEAST(COALESCE((v_item->>'count')::numeric, 0), 500);
    IF v_count < 0 OR v_count = 'NaN'::numeric THEN
      RETURN jsonb_build_object('error', 'invalid_state');
    END IF;
    -- Basispreise (Spiegel von BASE_SHOP_ITEM_COSTS im Frontend)
    v_base := CASE COALESCE((v_item->>'id')::int, -1)
      WHEN 0 THEN 15       WHEN 1 THEN 100      WHEN 2 THEN 500
      WHEN 3 THEN 2500     WHEN 4 THEN 12000    WHEN 5 THEN 60000
      WHEN 6 THEN 250000   WHEN 7 THEN 50       WHEN 8 THEN 500
      WHEN 9 THEN 5000     WHEN 10 THEN 50000   WHEN 11 THEN 12500000
      WHEN 12 THEN 50000000 WHEN 13 THEN 5000000 WHEN 14 THEN 20000000
      WHEN 15 THEN 100000000
      ELSE 0 END;
    IF v_count > 0 AND v_base > 0 THEN
      v_spent_min := v_spent_min + v_base * (power(1.15, v_count) - 1) / 0.15;
    END IF;

    -- CPS / Klickleistung des eingereichten Zustands hier nicht nötig —
    -- die Wachstumsgrenze unten nutzt bewusst den ALTEN Spielstand.
  END LOOP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_relics)
  LOOP
    v_relic_cost := CASE COALESCE((v_item->>'id')::int, -1)
      WHEN 0 THEN 25000000 WHEN 1 THEN 50000000
      WHEN 2 THEN 100000000 WHEN 3 THEN 200000000
      ELSE 0 END;
    v_spent_min := v_spent_min + v_relic_cost;
  END LOOP;

  IF p_energy + (v_spent_min * 0.5) > p_total_ever + 10000 THEN
    RETURN jsonb_build_object('error', 'invalid_state');
  END IF;

  -- ── Alten Spielstand sperren und laden ──
  SELECT * INTO v_old
  FROM public.bartclicker_scores
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF FOUND THEN
    -- Invariante 3: total_ever ist monoton steigend.
    IF p_total_ever < v_old.total_ever THEN
      RETURN jsonb_build_object('error', 'invalid_state');
    END IF;

    -- Wachstumsgrenze aus dem ALTEN Zustand ableiten:
    -- CPS und Klickleistung der bereits validierten Items × Rebirth-Multiplikator.
    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_old.shop_items, '[]'::jsonb))
    LOOP
      v_count := GREATEST(COALESCE((v_item->>'count')::numeric, 0), 0);
      v_cps   := COALESCE((v_item->>'cps')::numeric, 0);
      v_click := COALESCE((v_item->>'clickPower')::numeric, 0);
      v_cps_old   := v_cps_old   + GREATEST(v_cps, 0)   * v_count;
      v_click_old := v_click_old + GREATEST(v_click, 0) * v_count;
    END LOOP;
    v_cps_old   := v_cps_old   * power(2, LEAST(COALESCE(v_old.rebirth_count, 0), 500));
    v_click_old := v_click_old * power(2, LEAST(COALESCE(v_old.rebirth_count, 0), 500));

    v_elapsed := GREATEST(EXTRACT(EPOCH FROM (now() - COALESCE(v_old.last_updated, now()))), 1);

    -- Kapazität: CPS (×4 für Buffs/Relikte) + Klicks (35/s Hand+Autoclicker,
    -- ×6 für Buffs/Relikte, Grundleistung 1) + Kaufpotential aus gebunkerter
    -- Energie (billigste CPS-Quelle ≈ 0.0067 CPS pro Energie → /100 ist großzügig).
    v_capacity := (v_cps_old * 4) + ((GREATEST(v_click_old, 1)) * 35 * 6)
                  + (GREATEST(COALESCE(v_old.energy, 0), 0) / 100);
    v_gain_max := v_elapsed * v_capacity * 3 + 1000;

    IF p_total_ever - v_old.total_ever > v_gain_max THEN
      v_total_ever := v_old.total_ever + v_gain_max;
      v_energy     := LEAST(p_energy, v_total_ever);
      v_clamped    := true;
    END IF;

    UPDATE public.bartclicker_scores SET
      energy                       = v_energy,
      total_ever                   = v_total_ever,
      rebirth_count                = p_rebirth_count,
      rebirth_multiplier           = power(2, LEAST(p_rebirth_count, 500)),
      shop_items                   = p_shop_items,
      active_buffs                 = p_active_buffs,
      active_debuffs               = p_active_debuffs,
      relics                       = p_relics,
      offline_earning_upgrades     = p_offline_earning_upgrades,
      auto_click_buyer_enabled     = COALESCE(p_auto_click_buyer_enabled, false),
      auto_click_buyer_unlocked    = COALESCE(p_auto_click_buyer_unlocked, false),
      click_upgrade_buyer_enabled  = COALESCE(p_click_upgrade_buyer_enabled, false),
      click_upgrade_buyer_unlocked = COALESCE(p_click_upgrade_buyer_unlocked, false),
      click_upgrade_buyer_items    = p_click_upgrade_buyer_items,
      last_updated                 = now()
    WHERE user_id = v_user_id;
  ELSE
    -- Erster Spielstand: muss ein frischer Start sein. Legitime Clients legen
    -- direkt nach dem ersten Laden eine Null-Zeile an bzw. speichern binnen
    -- Sekunden — 10000 lässt dafür reichlich Luft.
    IF p_total_ever > 10000 OR p_rebirth_count > 0 THEN
      RETURN jsonb_build_object('error', 'invalid_state');
    END IF;

    INSERT INTO public.bartclicker_scores (
      user_id, energy, total_ever, rebirth_count, rebirth_multiplier,
      shop_items, active_buffs, active_debuffs, relics,
      offline_earning_upgrades,
      auto_click_buyer_enabled, auto_click_buyer_unlocked,
      click_upgrade_buyer_enabled, click_upgrade_buyer_unlocked,
      click_upgrade_buyer_items, last_updated
    ) VALUES (
      v_user_id, v_energy, v_total_ever, p_rebirth_count,
      power(2, LEAST(p_rebirth_count, 500)),
      p_shop_items, p_active_buffs, p_active_debuffs, p_relics,
      p_offline_earning_upgrades,
      COALESCE(p_auto_click_buyer_enabled, false), COALESCE(p_auto_click_buyer_unlocked, false),
      COALESCE(p_click_upgrade_buyer_enabled, false), COALESCE(p_click_upgrade_buyer_unlocked, false),
      p_click_upgrade_buyer_items, now()
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'clamped', v_clamped);
END;
$$;

ALTER FUNCTION public.save_bartclicker_state(
  numeric, numeric, integer, jsonb, jsonb, jsonb, jsonb,
  integer, boolean, boolean, boolean, boolean, jsonb
) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.save_bartclicker_state(
  numeric, numeric, integer, jsonb, jsonb, jsonb, jsonb,
  integer, boolean, boolean, boolean, boolean, jsonb
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.save_bartclicker_state(
  numeric, numeric, integer, jsonb, jsonb, jsonb, jsonb,
  integer, boolean, boolean, boolean, boolean, jsonb
) TO authenticated, service_role;

-- ── Direkte Schreibzugriffe entziehen — die RPC ist der einzige Schreibpfad ──
DROP POLICY IF EXISTS "insert_self" ON public.bartclicker_scores;
DROP POLICY IF EXISTS "update_self" ON public.bartclicker_scores;
-- SELECT (Leaderboard) und delete_moderator bleiben unverändert bestehen.
