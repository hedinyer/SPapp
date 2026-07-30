import assert from "node:assert/strict";
import { mergeCreditoLuegoContado } from "./merge-credito-contado.ts";

const base = {
  selfieUrl: null,
  referencia: null,
  condicion: null as null,
  color: "MORADA",
  userId: 23 as number | null,
};

{
  const merged = mergeCreditoLuegoContado(
    [
      {
        ...base,
        id: "cred-1",
        tipoVenta: "credito",
        placa: "DJX80I",
        modelo: "BERA SBR 150",
        fechaVenta: "2026-07-03",
        clienteNombre: "1013661114",
        clienteCedula: "1013661114",
        userId: 23,
        referencia: "BERA SBR MORADA 150",
      },
    ],
    [
      {
        ...base,
        id: "cont-1",
        tipoVenta: "contado",
        placa: "DJX-80I",
        modelo: "BERA SBR 150",
        fechaVenta: "2026-07-10",
        clienteNombre: "LINDA PACHECO",
        clienteCedula: "1013661114",
        userId: null,
      },
    ],
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0].tipoVenta, "credito_a_contado");
  assert.equal(merged[0].id, "cred-1");
  assert.equal(merged[0].fechaVenta, "2026-07-10");
  assert.equal(merged[0].referencia, "BERA SBR MORADA 150");
  assert.equal(merged[0].clienteNombre, "LINDA PACHECO");
}

{
  const merged = mergeCreditoLuegoContado(
    [
      {
        ...base,
        id: "cred-2",
        tipoVenta: "credito",
        placa: null,
        modelo: "AKT",
        fechaVenta: "2026-01-01",
        clienteNombre: "999",
        clienteCedula: "999",
      },
    ],
    [
      {
        ...base,
        id: "cont-2",
        tipoVenta: "contado",
        placa: "AAA11A",
        modelo: "OTRA",
        fechaVenta: "2026-02-01",
        clienteNombre: "Otro",
        clienteCedula: "111",
        userId: null,
      },
    ],
  );
  assert.equal(merged.length, 2);
}

console.log("merge-credito-contado.check: ok");
