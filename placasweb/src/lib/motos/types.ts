export type MotoCondicion = "nueva" | "usada";

export type MotoRow = {
  id: string;
  placa: string | null;
  numero_serie: string | null;
  condicion: MotoCondicion;
  foto_url: string;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

export const CONDICION_LABELS: Record<MotoCondicion, string> = {
  nueva: "Nueva",
  usada: "Usada",
};

export function motoIdentificador(moto: Pick<MotoRow, "placa" | "numero_serie">): string {
  if (moto.placa?.trim()) return moto.placa.trim().toUpperCase();
  if (moto.numero_serie?.trim()) return moto.numero_serie.trim();
  return "Sin identificador";
}
