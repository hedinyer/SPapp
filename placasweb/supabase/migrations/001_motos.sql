CREATE TABLE public.motos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placa         text,
  numero_serie  text,
  condicion     text NOT NULL CHECK (condicion IN ('nueva', 'usada')),
  foto_url      text NOT NULL,
  notas         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT motos_tiene_identificador CHECK (
    COALESCE(NULLIF(trim(placa), ''), NULLIF(trim(numero_serie), '')) IS NOT NULL
  )
);

CREATE UNIQUE INDEX motos_placa_unique
  ON public.motos (upper(trim(placa)))
  WHERE placa IS NOT NULL AND trim(placa) <> '';

CREATE UNIQUE INDEX motos_serie_unique
  ON public.motos (upper(trim(numero_serie)))
  WHERE numero_serie IS NOT NULL AND trim(numero_serie) <> '';

CREATE OR REPLACE FUNCTION public.set_motos_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_motos_updated_at ON public.motos;
CREATE TRIGGER trg_motos_updated_at
  BEFORE UPDATE ON public.motos
  FOR EACH ROW EXECUTE FUNCTION public.set_motos_updated_at();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'moto-fotos',
  'moto-fotos',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Allow public read moto fotos'
      AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Allow public read moto fotos"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'moto-fotos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Allow upload moto fotos'
      AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Allow upload moto fotos"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'moto-fotos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Allow update moto fotos'
      AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Allow update moto fotos"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'moto-fotos');
  END IF;
END;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.motos TO anon, authenticated;
