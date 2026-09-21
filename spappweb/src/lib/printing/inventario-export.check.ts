import assert from "node:assert/strict";
import {
  buildInventarioExport,
  inventarioExportFilename,
} from "./inventario-export.ts";
import type { InventarioProductoRow } from "../pipeline/types.ts";

function product(
  partial: Partial<InventarioProductoRow> & Pick<InventarioProductoRow, "id" | "nombre">,
): InventarioProductoRow {
  return {
    categoria_id: 1,
    sku: `SKU-${partial.id}`,
    descripcion: null,
    precio: 1000,
    costo: 2000,
    stock: 1,
    stock_minimo: 0,
    imagen_url: null,
    compatible_modelos: [],
    activo: true,
    inventario_categorias: { id: 1, nombre: "Test", slug: "test", descripcion: null, activo: true, orden: 0 },
    ...partial,
  };
}

{
  const { rows, summary } = buildInventarioExport([
    product({ id: 2, nombre: "Beta", precio: 10_000, costo: 15_000, stock: 2, stock_minimo: 1 }),
    product({ id: 1, nombre: "Alfa", precio: 5_000, costo: 8_000, stock: 0, stock_minimo: 2 }),
  ]);

  assert.equal(rows[0]?.nombre, "Alfa");
  assert.equal(rows[1]?.nombre, "Beta");

  // UI: "costo" = precio, "venta" = costo
  assert.equal(rows[0]?.costo, 5_000);
  assert.equal(rows[0]?.venta, 8_000);
  assert.equal(rows[0]?.stockBajo, true);
  assert.equal(rows[0]?.estado, "Activo");

  assert.equal(summary.productos, 2);
  assert.equal(summary.unidades, 2);
  assert.equal(summary.valorCosto, 5_000 * 0 + 10_000 * 2);
  assert.equal(summary.valorVenta, 8_000 * 0 + 15_000 * 2);
  assert.equal(summary.stockBajo, 1);
}

{
  assert.equal(
    inventarioExportFilename("pdf", new Date(2026, 8, 21)),
    "inventario-2026-09-21.pdf",
  );
  assert.equal(
    inventarioExportFilename("xlsx", new Date(2026, 0, 5)),
    "inventario-2026-01-05.xlsx",
  );
}

console.log("inventario-export.check.ts: ok");
