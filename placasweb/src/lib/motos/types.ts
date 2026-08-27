export type MotoCondicion = "nueva" | "usada";

export type MotoUbicacion = "soluciones" | "bera" | "casa" | "bodega";

export type MotoRow = {
  id: string;
  placa: string | null;
  numero_serie: string | null;
  condicion: MotoCondicion;
  foto_url: string;
  notas: string | null;
  /** Nuevas: soluciones|bera|casa|bodega. Filas viejas pueden tener otras. */
  ubicacion: string;
  pagos: number | null;
  aliado: string | null;
  veces_vendida: number | null;
  inventariado_en: string | null;
  created_at: string;
  updated_at: string;
};

export const CONDICION_LABELS: Record<MotoCondicion, string> = {
  nueva: "Nueva",
  usada: "Usada",
};

export const UBICACION_LABELS: Record<MotoUbicacion, string> = {
  soluciones: "Soluciones",
  bera: "Bera",
  casa: "Casa",
  bodega: "Bodega",
};

export const UBICACION_ORDER: MotoUbicacion[] = [
  "soluciones",
  "bera",
  "casa",
  "bodega",
];

const UBICACION_SET = new Set<string>(UBICACION_ORDER);

/** Fecha civil YYYY-MM-DD en America/Bogota. */
export function hoyBogota(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function esInventariadaHoy(
  moto: Pick<MotoRow, "inventariado_en">,
  hoy = hoyBogota(),
): boolean {
  return moto.inventariado_en === hoy;
}

export function isMotoUbicacion(value: unknown): value is MotoUbicacion {
  return typeof value === "string" && UBICACION_SET.has(value);
}

/** Ubicación conocida para listar/CSV; filas legacy quedan fuera de los grupos nuevos. */
export function ubicacionLabel(ubicacion: string | null | undefined): string {
  if (ubicacion && isMotoUbicacion(ubicacion)) return UBICACION_LABELS[ubicacion];
  return ubicacion?.trim() || "";
}

export function motoIdentificador(moto: Pick<MotoRow, "placa" | "numero_serie">): string {
  if (moto.placa?.trim()) return moto.placa.trim().toUpperCase();
  if (moto.numero_serie?.trim()) return moto.numero_serie.trim();
  return "Sin identificador";
}

const LAST_UBICACION_KEY = "placasweb:last-ubicacion";

export function readLastUbicacion(): MotoUbicacion {
  if (typeof sessionStorage === "undefined") return "bodega";
  try {
    const raw = sessionStorage.getItem(LAST_UBICACION_KEY);
    if (raw && isMotoUbicacion(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "bodega";
}

export function writeLastUbicacion(ubicacion: MotoUbicacion): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(LAST_UBICACION_KEY, ubicacion);
  } catch {
    /* ignore */
  }
}
