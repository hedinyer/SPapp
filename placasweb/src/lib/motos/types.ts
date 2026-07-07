export type MotoCondicion = "nueva" | "usada";

export type MotoUbicacion = "soluciones_pinilla" | "lavadero" | "parqueadero";

export type MotoRow = {
  id: string;
  placa: string | null;
  numero_serie: string | null;
  condicion: MotoCondicion;
  foto_url: string;
  notas: string | null;
  ubicacion: MotoUbicacion;
  created_at: string;
  updated_at: string;
};

export const CONDICION_LABELS: Record<MotoCondicion, string> = {
  nueva: "Nueva",
  usada: "Usada",
};

export const UBICACION_LABELS: Record<MotoUbicacion, string> = {
  soluciones_pinilla: "Soluciones Pinilla",
  lavadero: "Lavadero",
  parqueadero: "Parqueadero",
};

export const UBICACION_ORDER: MotoUbicacion[] = [
  "soluciones_pinilla",
  "lavadero",
  "parqueadero",
];

export function motoIdentificador(moto: Pick<MotoRow, "placa" | "numero_serie">): string {
  if (moto.placa?.trim()) return moto.placa.trim().toUpperCase();
  if (moto.numero_serie?.trim()) return moto.numero_serie.trim();
  return "Sin identificador";
}
