-- Fix: "Marcar entregada" hit statement timeout.
-- Cause: generate_tarifas_for_compra inserted up to 365 rows one-by-one and
-- each INSERT fired sync_mora_for_compra (expensive atrasos view).

-- Sync mora only on tarifa UPDATE (pagos / vencidas), not on bulk INSERT.
DROP TRIGGER IF EXISTS trg_sync_mora_on_tarifa_pagada ON public.tarifas_pagadas;
CREATE TRIGGER trg_sync_mora_on_tarifa_pagada
  AFTER UPDATE ON public.tarifas_pagadas
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_mora_on_tarifa_pagada();

CREATE OR REPLACE FUNCTION public.generate_tarifas_for_compra(p_compra_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_compra record;
  v_total integer;
  v_intervalo integer;
  v_fecha_inicio date;
BEGIN
  SELECT *
  INTO v_compra
  FROM public.user_moto_compra
  WHERE id = p_compra_id;

  IF v_compra IS NULL OR v_compra.estado <> 'entregada' THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.tarifas_pagadas WHERE user_moto_compra_id = p_compra_id
  ) THEN
    RETURN;
  END IF;

  SELECT total_periodos, dias_intervalo
  INTO v_total, v_intervalo
  FROM public.tarifa_period_config(v_compra.frecuencia_pago);

  -- Dia despues del inicio del credito (inicio = entrega + 1)
  v_fecha_inicio := COALESCE(v_compra.fecha_entrega, CURRENT_DATE) + 2;

  INSERT INTO public.tarifas_pagadas (
    user_moto_compra_id,
    user_id,
    numero_periodo,
    fecha_vencimiento,
    monto_esperado,
    monto_pagado,
    estado,
    pagada_at,
    confirmada_por,
    notas
  )
  SELECT
    v_compra.id,
    v_compra.user_id,
    g.i,
    v_fecha_inicio + ((g.i - 1) * v_intervalo),
    v_compra.monto_cuota_periodo,
    CASE WHEN g.i = 1 THEN v_compra.monto_cuota_periodo ELSE NULL END,
    CASE WHEN g.i = 1 THEN 'pagada' ELSE 'pendiente' END,
    CASE WHEN g.i = 1 THEN COALESCE(v_compra.pago_cuota_confirmado_at, now()) ELSE NULL END,
    CASE WHEN g.i = 1 THEN 'sistema' ELSE NULL END,
    CASE WHEN g.i = 1 THEN 'Cuota adelantada al retiro' ELSE NULL END
  FROM generate_series(1, v_total) AS g(i);

  -- One sync after bulk insert (INSERT no longer triggers mora sync).
  PERFORM public.sync_mora_for_compra(p_compra_id);
END;
$$;
