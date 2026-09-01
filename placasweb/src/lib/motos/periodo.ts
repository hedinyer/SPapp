import {
  UBICACION_LABELS,
  UBICACION_ORDER,
  ubicacionLabel,
  motoIdentificador,
  type MotoRow,
} from "./types.ts";

export const PERIODO_AGOSTO_2026 = {
  desde: "2026-08-23",
  hasta: "2026-08-31",
  label: "23–31 agosto 2026",
} as const;

export function fechaBogota(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function horaBogota(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function fechaLabel(fecha: string): string {
  const [y, m, d] = fecha.split("-");
  return `${Number(d)} ${mesCorto(Number(m))} ${y}`;
}

function mesCorto(month: number): string {
  return (
    ["", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][
      month
    ] ?? ""
  );
}

export function esSubida(
  moto: Pick<MotoRow, "created_at" | "updated_at">,
): boolean {
  return (
    Math.abs(
      new Date(moto.updated_at).getTime() - new Date(moto.created_at).getTime(),
    ) < 2000
  );
}

export function motoEnPeriodo(
  moto: Pick<MotoRow, "updated_at">,
  desde: string,
  hasta: string,
): boolean {
  const f = fechaBogota(moto.updated_at);
  return f >= desde && f <= hasta;
}

export function sortByIdentificador(motos: MotoRow[]): MotoRow[] {
  return [...motos].sort((a, b) =>
    motoIdentificador(a).localeCompare(motoIdentificador(b), "es"),
  );
}

export type UbicacionGrupo = {
  key: string;
  label: string;
  motos: MotoRow[];
  dias: { fecha: string; label: string; motos: MotoRow[] }[];
};

/** Ubicación conocida primero; legacy al final. Dentro: por día y placa. */
export function groupByUbicacionYDia(motos: MotoRow[]): UbicacionGrupo[] {
  const byUbicacion = new Map<string, MotoRow[]>();

  for (const moto of motos) {
    const key = moto.ubicacion?.trim() || "sin-ubicacion";
    const list = byUbicacion.get(key) ?? [];
    list.push(moto);
    byUbicacion.set(key, list);
  }

  const grupos: UbicacionGrupo[] = [];

  for (const key of UBICACION_ORDER) {
    const list = byUbicacion.get(key);
    if (!list?.length) continue;
    grupos.push(buildGrupo(key, UBICACION_LABELS[key], list));
    byUbicacion.delete(key);
  }

  for (const [key, list] of [...byUbicacion.entries()].sort(([a], [b]) =>
    a.localeCompare(b, "es"),
  )) {
    if (!list.length) continue;
    grupos.push(buildGrupo(key, ubicacionLabel(key) || key, list));
  }

  return grupos;
}

function buildGrupo(
  key: string,
  label: string,
  motos: MotoRow[],
): UbicacionGrupo {
  const byDia = new Map<string, MotoRow[]>();
  for (const moto of motos) {
    const dia = fechaBogota(moto.updated_at);
    const list = byDia.get(dia) ?? [];
    list.push(moto);
    byDia.set(dia, list);
  }

  const dias = [...byDia.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, diaMotos]) => ({
      fecha,
      label: fechaLabel(fecha),
      motos: sortByIdentificador(diaMotos),
    }));

  return { key, label, motos: sortByIdentificador(motos), dias };
}

export function resumenPeriodo(motos: MotoRow[]) {
  const subidas = motos.filter(esSubida).length;
  return {
    total: motos.length,
    subidas,
    actualizadas: motos.length - subidas,
  };
}
