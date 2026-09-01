import assert from "node:assert/strict";
import {
  PERIODO_AGOSTO_2026,
  esSubida,
  fechaBogota,
  groupByUbicacionYDia,
  motoEnPeriodo,
} from "./periodo.ts";
import type { MotoRow } from "./types.ts";

function moto(partial: Partial<MotoRow> & Pick<MotoRow, "id">): MotoRow {
  return {
    placa: "ABC12D",
    numero_serie: null,
    condicion: "usada",
    foto_url: "https://example.com/f.jpg",
    notas: null,
    ubicacion: "bodega",
    pagos: null,
    aliado: null,
    veces_vendida: null,
    inventariado_en: null,
    created_at: "2026-08-27T20:00:00.000Z",
    updated_at: "2026-08-27T20:00:00.000Z",
    ...partial,
  };
}

assert.equal(fechaBogota("2026-08-28T22:36:47.925Z"), "2026-08-28");
assert.equal(fechaBogota("2026-08-28T03:10:20.779Z"), "2026-08-27");

assert(
  motoEnPeriodo(
    { updated_at: "2026-08-27T20:00:00.000Z" },
    PERIODO_AGOSTO_2026.desde,
    PERIODO_AGOSTO_2026.hasta,
  ),
);
assert(
  !motoEnPeriodo(
    { updated_at: "2026-09-01T12:00:00.000Z" },
    PERIODO_AGOSTO_2026.desde,
    PERIODO_AGOSTO_2026.hasta,
  ),
);

assert(esSubida(moto({ id: "1" })));
assert(
  !esSubida(
    moto({
      id: "2",
      created_at: "2026-08-26T20:00:00.000Z",
      updated_at: "2026-08-27T20:00:00.000Z",
    }),
  ),
);

const grupos = groupByUbicacionYDia([
  moto({ id: "b1", placa: "ZZZ99H", ubicacion: "bodega" }),
  moto({ id: "s1", placa: "AAA11H", ubicacion: "soluciones" }),
  moto({ id: "b2", placa: "AAA10H", ubicacion: "bodega" }),
]);
assert.equal(grupos[0]?.key, "soluciones");
assert.equal(grupos[1]?.key, "bodega");
assert.equal(grupos[1]?.motos[0]?.placa, "AAA10H");

console.log("periodo.check.ts OK");
