import assert from "node:assert/strict";
import { formatTarifas, resolveCruceDisplay } from "./cruce.ts";

const base = { pagos: 10, aliado: "LOCAL", veces_vendida: 1 };

assert.deepEqual(
  resolveCruceDisplay(base, {
    placa: "ABC",
    numero_serie: null,
    placasweb: base,
    viaduct: {
      vehiculo_id: 1,
      placa_viaduct: "ABC",
      serie_viaduct: null,
      propietario: "VIADUCT ALIADO",
      marca: "Bera",
      modelo: "2026",
      estado_vehiculo: "Activo",
      veces_vendida: 3,
      tarifas_pagadas: 99,
      contrato_activo: null,
    },
    spappweb: null,
  }).prenda,
  "VIADUCT ALIADO",
);

assert.equal(
  resolveCruceDisplay(base, undefined).prenda,
  "LOCAL",
);

assert.equal(formatTarifas(48.5), "48,50");
assert.equal(formatTarifas(91.21), "91,21");
assert.equal(formatTarifas(91), "91");

console.log("cruce.check.ts OK");
