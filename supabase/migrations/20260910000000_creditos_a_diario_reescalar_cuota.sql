-- Homogeneizar frecuencia a diario: reescala monto_cuota_periodo (periodo/7|15|30).
-- No borra tarifas, pagos, congelamientos ni contratos PDF.

UPDATE public.user_moto_compra
SET
  monto_cuota_periodo = monto_cuota_periodo / CASE frecuencia_pago
    WHEN 'semanal' THEN 7
    WHEN 'quincenal' THEN 15
    WHEN 'mensual' THEN 30
  END,
  frecuencia_pago = 'diario'
WHERE frecuencia_pago <> 'diario'
  AND estado NOT IN ('cancelada', 'saldada');

UPDATE public.digital_contracts dc
SET admin_data = COALESCE(dc.admin_data, '{}'::jsonb)
  || jsonb_build_object(
    'frecuencia_pago', 'diario',
    'valor_cuota', c.monto_cuota_periodo
  )
FROM public.user_moto_compra c
WHERE c.digital_contract_id = dc.id
  AND c.frecuencia_pago = 'diario'
  AND c.estado NOT IN ('cancelada', 'saldada')
  AND COALESCE(dc.admin_data->>'frecuencia_pago', '') IN (
    'semanal', 'quincenal', 'mensual'
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.user_moto_compra
    WHERE estado = 'entregada'
      AND frecuencia_pago <> 'diario'
  ) THEN
    RAISE EXCEPTION 'quedan entregadas con frecuencia distinto de diario';
  END IF;
END $$;
