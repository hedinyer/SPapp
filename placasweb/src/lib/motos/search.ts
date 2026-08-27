import type { MotoRow } from "./types";

/** Normaliza placa/serie para comparar sin espacios ni mayúsculas. */
export function normalizeMotoQuery(query: string): string {
  return query.trim().toUpperCase().replace(/[\s-]/g, "");
}

export function motoMatchesQuery(
  moto: Pick<MotoRow, "placa" | "numero_serie">,
  query: string,
): boolean {
  const needle = normalizeMotoQuery(query);
  if (!needle) return true;

  const placa = normalizeMotoQuery(moto.placa ?? "");
  const serie = normalizeMotoQuery(moto.numero_serie ?? "");
  return placa.includes(needle) || serie.includes(needle);
}

/** Match exacto de placa o serie normalizada (conteo de inventario). */
export function findMotoExact(
  motos: Pick<MotoRow, "id" | "placa" | "numero_serie">[],
  query: string,
): (typeof motos)[number] | null {
  const needle = normalizeMotoQuery(query);
  if (!needle) return null;

  return (
    motos.find((moto) => {
      const placa = normalizeMotoQuery(moto.placa ?? "");
      const serie = normalizeMotoQuery(moto.numero_serie ?? "");
      return placa === needle || serie === needle;
    }) ?? null
  );
}
