import {
  CONDICION_LABELS,
  UBICACION_LABELS,
  UBICACION_ORDER,
  type MotoRow,
} from "./types.ts";

const HEADERS = [
  "Placa",
  "Número de serie",
  "Condición",
  "Ubicación",
  "Aliado",
  "Días pagados",
  "Veces vendida",
  "Notas",
  "Foto",
  "Creada",
  "Actualizada",
] as const;

function csvField(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

function cell(value: string | number | null | undefined): string {
  if (value == null || value === "") return "";
  return csvField(String(value));
}

/** Mismo orden que la lista: ubicación, luego días pagados desc. */
export function sortVisibleMotos(motos: MotoRow[]): MotoRow[] {
  return UBICACION_ORDER.flatMap((ubicacion) =>
    motos
      .filter((moto) => moto.ubicacion === ubicacion)
      .sort((a, b) => (b.pagos ?? -1) - (a.pagos ?? -1)),
  );
}

// ponytail: CSV+BOM opens in Excel; xlsx lib if they need a real .xlsx
export function motosToCsv(motos: MotoRow[]): string {
  const rows = motos.map((moto) =>
    [
      cell(moto.placa?.trim().toUpperCase() || null),
      cell(moto.numero_serie?.trim() || null),
      csvField(CONDICION_LABELS[moto.condicion]),
      csvField(UBICACION_LABELS[moto.ubicacion]),
      cell(moto.aliado?.trim() || null),
      cell(moto.pagos),
      cell(moto.veces_vendida),
      cell(moto.notas?.trim() || null),
      cell(moto.foto_url),
      cell(moto.created_at),
      cell(moto.updated_at),
    ].join(","),
  );
  return `\uFEFF${[HEADERS.join(","), ...rows].join("\r\n")}`;
}
