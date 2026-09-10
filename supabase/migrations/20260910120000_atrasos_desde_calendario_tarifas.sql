-- Mora desde calendario real de tarifas_pagadas (no fórmula inventada post-freeze).
-- Dolly y similares: días/monto = primera cuota incompleta vencida, no ancla reconstruida.

DROP VIEW IF EXISTS public.atrasos;

CREATE VIEW public.atrasos
WITH (security_invoker = true) AS
SELECT
  c.id                    AS user_moto_compra_id,
  c.user_id,
  c.frecuencia_pago,
  base.fecha_inicio,
  cfg.dias_intervalo,
  calc.periodos_debidos,
  calc.periodos_pagados,
  calc.monto_esperado,
  calc.monto_pagado,
  calc.monto_adeudado,
  calc.fecha_desde_atraso,
  calc.dias_atraso,
  calc.tarifa_vencida_id,
  CASE
    WHEN calc.monto_adeudado <= 0 THEN 'al_dia'
    WHEN calc.dias_atraso >= 3 THEN 'moroso'
    WHEN calc.monto_adeudado > 0 THEN 'vencido'
    ELSE 'al_dia'
  END AS estado
FROM public.user_moto_compra c
LEFT JOIN LATERAL (
  SELECT dc.signed_at
  FROM public.digital_contracts dc
  WHERE dc.user_id = c.user_id
    AND dc.status = 'firmado'
  ORDER BY dc.signed_at DESC NULLS LAST
  LIMIT 1
) dc ON true
CROSS JOIN LATERAL (
  SELECT (now() AT TIME ZONE 'America/Bogota')::date AS v_today
) tz
CROSS JOIN LATERAL (
  SELECT EXISTS (
    SELECT 1
    FROM public.tarifas_pagadas t
    WHERE t.user_moto_compra_id = c.id
  ) AS tiene_calendario
) cal_flag
CROSS JOIN LATERAL (
  SELECT COALESCE(
    (
      SELECT MIN(t.fecha_vencimiento)
      FROM public.tarifas_pagadas t
      WHERE t.user_moto_compra_id = c.id
    ),
    COALESCE(
      c.fecha_entrega,
      (dc.signed_at AT TIME ZONE 'America/Bogota')::date,
      c.seleccionado_at::date
    ) + 2
  ) AS fecha_inicio
) base
CROSS JOIN LATERAL (
  SELECT
    tpc.dias_intervalo,
    tpc.total_periodos
  FROM public.tarifa_period_config(c.frecuencia_pago) tpc
) cfg
CROSS JOIN LATERAL (
  SELECT
    COALESCE((
      SELECT SUM(
        LEAST(
          cc.dias,
          GREATEST(
            0,
            tz.v_today - (cc.created_at AT TIME ZONE 'America/Bogota')::date
          )
        )
      )
      FROM public.congelamientos_cuotas cc
      WHERE cc.user_moto_compra_id = c.id
    ), 0)::integer AS dias_congelados,
    (
      SELECT MAX(
        (cc.created_at AT TIME ZONE 'America/Bogota')::date + cc.dias
      )
      FROM public.congelamientos_cuotas cc
      WHERE cc.user_moto_compra_id = c.id
    ) AS freeze_end
) frz
CROSS JOIN LATERAL (
  -- Deuda / ancla desde calendario cuando existe
  SELECT
    COALESCE((
      SELECT COUNT(*)::integer
      FROM public.tarifas_pagadas t
      WHERE t.user_moto_compra_id = c.id
        AND t.fecha_vencimiento <= tz.v_today
    ), 0) AS cal_periodos_debidos,
    COALESCE((
      SELECT COUNT(*)::integer
      FROM public.tarifas_pagadas t
      WHERE t.user_moto_compra_id = c.id
        AND t.estado = 'pagada'
    ), 0) AS cal_periodos_pagados,
    COALESCE((
      SELECT SUM(t.monto_esperado)::bigint
      FROM public.tarifas_pagadas t
      WHERE t.user_moto_compra_id = c.id
        AND t.fecha_vencimiento <= tz.v_today
    ), 0) AS cal_monto_esperado,
    (
      COALESCE((
        SELECT SUM(COALESCE(t.monto_pagado, t.monto_esperado, 0))
        FROM public.tarifas_pagadas t
        WHERE t.user_moto_compra_id = c.id
          AND t.estado = 'pagada'
      ), 0)
      + COALESCE((
        SELECT SUM(COALESCE(t.monto_pagado, 0))
        FROM public.tarifas_pagadas t
        WHERE t.user_moto_compra_id = c.id
          AND t.estado IN ('pendiente', 'vencida')
          AND COALESCE(t.monto_pagado, 0) > 0
      ), 0)
      + COALESCE((
        SELECT SUM(p.monto)
        FROM public.pagos p
        WHERE p.user_moto_compra_id = c.id
          AND p.estado = 'confirmado'
          AND COALESCE(p.contexto_pago, 'tarifa') NOT IN ('inicial', 'visita', 'cuota_adelantada')
          AND NOT EXISTS (
            SELECT 1
            FROM public.pago_tarifa_aplicaciones pta
            WHERE pta.pago_id = p.id
          )
      ), 0)
    )::bigint AS cal_monto_pagado,
    COALESCE((
      SELECT SUM(t.monto_esperado - COALESCE(t.monto_pagado, 0))::bigint
      FROM public.tarifas_pagadas t
      WHERE t.user_moto_compra_id = c.id
        AND t.fecha_vencimiento <= tz.v_today
        AND COALESCE(t.monto_pagado, 0) < t.monto_esperado
        AND t.estado IN ('pendiente', 'vencida')
    ), 0) AS cal_monto_adeudado,
    (
      SELECT MIN(t.fecha_vencimiento)
      FROM public.tarifas_pagadas t
      WHERE t.user_moto_compra_id = c.id
        AND t.fecha_vencimiento <= tz.v_today
        AND COALESCE(t.monto_pagado, 0) < t.monto_esperado
        AND t.estado IN ('pendiente', 'vencida')
    ) AS cal_fecha_desde_atraso,
    (
      SELECT t.id
      FROM public.tarifas_pagadas t
      WHERE t.user_moto_compra_id = c.id
        AND t.fecha_vencimiento <= tz.v_today
        AND COALESCE(t.monto_pagado, 0) < t.monto_esperado
        AND t.estado IN ('pendiente', 'vencida')
      ORDER BY t.fecha_vencimiento ASC
      LIMIT 1
    ) AS cal_tarifa_vencida_id
) cal
CROSS JOIN LATERAL (
  -- Fallback sin calendario (misma lógica previa)
  SELECT
    GREATEST(0, LEAST(
      cfg.total_periodos,
      CASE
        WHEN tz.v_today < base.fecha_inicio THEN 0
        ELSE (
          (tz.v_today - base.fecha_inicio - frz.dias_congelados)
            / NULLIF(cfg.dias_intervalo, 0)
        )::integer + 1
      END
    )) AS fb_periodos_debidos,
    (
      CASE
        WHEN c.pago_cuota_confirmado THEN c.monto_cuota_periodo
        ELSE 0
      END
      + COALESCE((
        SELECT SUM(p.monto)
        FROM public.pagos p
        WHERE p.user_moto_compra_id = c.id
          AND p.estado = 'confirmado'
          AND COALESCE(p.contexto_pago, 'tarifa') NOT IN ('inicial', 'visita', 'cuota_adelantada')
          AND NOT EXISTS (
            SELECT 1
            FROM public.pago_tarifa_aplicaciones pta
            WHERE pta.pago_id = p.id
          )
      ), 0)
    )::bigint AS fb_monto_pagado_raw
) fb
CROSS JOIN LATERAL (
  SELECT
    CASE
      WHEN cal_flag.tiene_calendario THEN cal.cal_periodos_debidos
      ELSE fb.fb_periodos_debidos
    END AS periodos_debidos,
    CASE
      WHEN cal_flag.tiene_calendario THEN cal.cal_periodos_pagados
      ELSE GREATEST(
        0,
        FLOOR(
          fb.fb_monto_pagado_raw::numeric
            / NULLIF(c.monto_cuota_periodo, 0)::numeric
        )::integer
      )
    END AS periodos_pagados,
    CASE
      WHEN cal_flag.tiene_calendario THEN cal.cal_monto_esperado
      ELSE (fb.fb_periodos_debidos * c.monto_cuota_periodo)
    END AS monto_esperado,
    CASE
      WHEN cal_flag.tiene_calendario THEN cal.cal_monto_pagado
      ELSE fb.fb_monto_pagado_raw
    END AS monto_pagado,
    CASE
      WHEN cal_flag.tiene_calendario THEN cal.cal_monto_adeudado
      ELSE GREATEST(
        0,
        (fb.fb_periodos_debidos * c.monto_cuota_periodo) - fb.fb_monto_pagado_raw
      )
    END AS monto_adeudado,
    CASE
      WHEN cal_flag.tiene_calendario THEN
        CASE
          WHEN cal.cal_monto_adeudado <= 0 THEN NULL
          ELSE cal.cal_fecha_desde_atraso
        END
      ELSE
        CASE
          WHEN GREATEST(
            0,
            (fb.fb_periodos_debidos * c.monto_cuota_periodo) - fb.fb_monto_pagado_raw
          ) <= 0 THEN NULL
          ELSE GREATEST(
            base.fecha_inicio + frz.dias_congelados + (
              GREATEST(
                0,
                FLOOR(
                  fb.fb_monto_pagado_raw::numeric
                    / NULLIF(c.monto_cuota_periodo, 0)::numeric
                )::integer
              )
            ) * cfg.dias_intervalo,
            frz.freeze_end
          )
        END
    END AS fecha_desde_atraso,
    CASE
      WHEN cal_flag.tiene_calendario THEN
        CASE
          WHEN cal.cal_monto_adeudado <= 0 THEN 0
          WHEN frz.freeze_end IS NOT NULL AND tz.v_today < frz.freeze_end THEN 0
          WHEN cal.cal_fecha_desde_atraso IS NULL THEN 0
          ELSE GREATEST(0, (tz.v_today - cal.cal_fecha_desde_atraso) + 1)
        END
      ELSE
        CASE
          WHEN GREATEST(
            0,
            (fb.fb_periodos_debidos * c.monto_cuota_periodo) - fb.fb_monto_pagado_raw
          ) <= 0 THEN 0
          WHEN frz.freeze_end IS NOT NULL AND tz.v_today < frz.freeze_end THEN 0
          ELSE GREATEST(0,
            (tz.v_today - GREATEST(
              base.fecha_inicio + frz.dias_congelados + (
                GREATEST(
                  0,
                  FLOOR(
                    fb.fb_monto_pagado_raw::numeric
                      / NULLIF(c.monto_cuota_periodo, 0)::numeric
                  )::integer
                )
              ) * cfg.dias_intervalo,
              frz.freeze_end
            )) + 1
          )
        END
    END AS dias_atraso,
    CASE
      WHEN cal_flag.tiene_calendario THEN cal.cal_tarifa_vencida_id
      ELSE (
        SELECT t.id
        FROM public.tarifas_pagadas t
        WHERE t.user_moto_compra_id = c.id
          AND t.estado IN ('pendiente', 'vencida')
          AND t.fecha_vencimiento <= tz.v_today
        ORDER BY t.fecha_vencimiento ASC
        LIMIT 1
      )
    END AS tarifa_vencida_id
) calc
WHERE c.estado = 'entregada';

GRANT SELECT ON public.atrasos TO anon, authenticated;

SELECT public.evaluar_mora_diaria();
