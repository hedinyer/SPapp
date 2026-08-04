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
