-- Fix: congelar cuotas timeout.
-- Cause: UPDATE of N pending tarifas fired sync_mora_for_compra per row
-- (~45ms × 300+ = statement timeout). Function already syncs once at the end.

CREATE OR REPLACE FUNCTION public.congelar_cuotas_compra(
  p_compra_id uuid,
  p_dias integer,
  p_observaciones text DEFAULT NULL,
  p_admin text DEFAULT 'admin'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_compra record;
  v_today date;
  v_freeze_end date;
  v_min date;
  v_delta integer;
  v_afectadas integer;
BEGIN
  IF p_dias IS NULL OR p_dias <= 0 THEN
    RAISE EXCEPTION 'Los días deben ser mayores a cero.';
  END IF;

  SELECT *
  INTO v_compra
  FROM public.user_moto_compra
  WHERE id = p_compra_id;

  IF v_compra IS NULL THEN
    RAISE EXCEPTION 'Compra no encontrada.';
  END IF;

  IF v_compra.estado <> 'entregada' THEN
    RAISE EXCEPTION 'Solo se pueden congelar cuotas de compras entregadas.';
  END IF;

  v_today := (now() AT TIME ZONE 'America/Bogota')::date;
  v_freeze_end := v_today + p_dias;

  SELECT MIN(t.fecha_vencimiento)
  INTO v_min
  FROM public.tarifas_pagadas t
  WHERE t.user_moto_compra_id = p_compra_id
    AND t.estado IN ('pendiente', 'vencida');

  IF v_min IS NULL THEN
    RAISE EXCEPTION 'No hay cuotas pendientes o vencidas para congelar.';
  END IF;

  v_delta := GREATEST(p_dias, v_freeze_end - v_min);

  -- ponytail: skip per-row mora sync during bulk shift; one sync below
  ALTER TABLE public.tarifas_pagadas DISABLE TRIGGER trg_sync_mora_on_tarifa_pagada;

  UPDATE public.tarifas_pagadas
  SET
    fecha_vencimiento = fecha_vencimiento + v_delta,
    estado = CASE
      WHEN estado = 'vencida'
        AND (fecha_vencimiento + v_delta) >= v_today
        THEN 'pendiente'
      ELSE estado
    END,
    updated_at = now()
  WHERE user_moto_compra_id = p_compra_id
    AND estado IN ('pendiente', 'vencida');

  GET DIAGNOSTICS v_afectadas = ROW_COUNT;

  ALTER TABLE public.tarifas_pagadas ENABLE TRIGGER trg_sync_mora_on_tarifa_pagada;

  INSERT INTO public.congelamientos_cuotas (
    user_moto_compra_id,
    user_id,
    dias,
    observaciones,
    creado_por
  ) VALUES (
    p_compra_id,
    v_compra.user_id,
    p_dias,
    NULLIF(trim(p_observaciones), ''),
    p_admin
  );

  PERFORM public.sync_mora_for_compra(p_compra_id);

  RETURN v_afectadas;
EXCEPTION
  WHEN OTHERS THEN
    ALTER TABLE public.tarifas_pagadas ENABLE TRIGGER trg_sync_mora_on_tarifa_pagada;
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.congelar_cuotas_compra(uuid, integer, text, text)
  TO anon, authenticated, service_role;
