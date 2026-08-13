import { motosToCsv, sortVisibleMotos } from "./csv.ts";
import type { MotoRow } from "./types.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function moto(overrides: Partial<MotoRow>): MotoRow {
  return {
    id: "1",
    placa: "DXA96H",
    numero_serie: null,
    condicion: "usada",
    foto_url: "https://example.com/foto.jpg",
    notas: null,
    ubicacion: "soluciones_pinilla",
    pagos: 10,
    aliado: "OSCAR",
    veces_vendida: 1,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    ...overrides,
  };
}

const csv = motosToCsv([
  moto({
    notas: 'Falta motor, "urgente"',
  }),
]);

assert(csv.startsWith("\uFEFF"), "BOM para Excel");
assert(csv.includes("Placa,Número de serie,Condición,Ubicación"), "cabeceras");
assert(csv.includes("Usada"), "label condición");
assert(csv.includes("Soluciones Pinilla"), "label ubicación");
assert(csv.includes('"Falta motor, ""urgente"""'), "escapa comas y comillas");

const sorted = sortVisibleMotos([
  moto({ id: "lav", ubicacion: "lavadero", pagos: 99 }),
  moto({ id: "pin-baja", ubicacion: "soluciones_pinilla", pagos: 1 }),
  moto({ id: "pin-alta", ubicacion: "soluciones_pinilla", pagos: 50 }),
  moto({ id: "parq", ubicacion: "parqueadero", pagos: null }),
]);
assert(
  sorted.map((row) => row.id).join(",") === "pin-alta,pin-baja,lav,parq",
  "orden ubicación luego pagos desc",
);

console.log("csv.check.ts: ok");
