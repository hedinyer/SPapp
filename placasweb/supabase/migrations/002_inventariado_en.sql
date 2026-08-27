-- Inventario del día: marca cuándo se contó la moto (fecha Colombia en app).
-- No remapea ubicaciones viejas (lavadero/parqueadero/soluciones_pinilla).
ALTER TABLE public.motos
  ADD COLUMN IF NOT EXISTS inventariado_en date;
