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
    ubicacion: "soluciones",
    pagos: 10,
    aliado: "OSCAR",
    veces_vendida: 1,
    inventariado_en: "2026-08-27",
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
assert(csv.includes("Soluciones"), "label ubicación");
assert(csv.includes('"Falta motor, ""urgente"""'), "escapa comas y comillas");
assert(!csv.includes("Foto"), "sin columna foto");
assert(!csv.includes("https://example.com/foto.jpg"), "sin url de foto");

const sorted = sortVisibleMotos([
  moto({ id: "bod", ubicacion: "bodega", pagos: 99 }),
  moto({ id: "sol-baja", ubicacion: "soluciones", pagos: 1 }),
  moto({ id: "sol-alta", ubicacion: "soluciones", pagos: 50 }),
  moto({ id: "bera", ubicacion: "bera", pagos: null }),
  moto({ id: "legacy", ubicacion: "lavadero", pagos: 100 }),
]);
assert(
  sorted.map((row) => row.id).join(",") === "sol-alta,sol-baja,bera,bod",
  "orden ubicación luego pagos desc; legacy fuera",
);

console.log("csv.check.ts: ok");
