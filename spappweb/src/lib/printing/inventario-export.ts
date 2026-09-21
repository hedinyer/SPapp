import type { InventarioProductoRow } from "@/lib/pipeline/types";

/**
 * En la UI de Stock la etiqueta "costo" muestra `precio` y "venta" muestra `costo`.
 * El export replica esa correspondencia para que el archivo coincida con la tabla.
 */
export type InventarioExportRow = {
  id: number;
  nombre: string;
  sku: string;
  categoria: string;
  /** Monto etiquetado como "costo" en pantalla (= precio). */
  costo: number;
  /** Monto etiquetado como "venta" en pantalla (= costo). */
  venta: number;
  stock: number;
  stockMinimo: number;
  stockBajo: boolean;
  activo: boolean;
  estado: "Activo" | "Inactivo";
  descripcion: string;
  modelosCompatibles: string;
  imagenPath: string | null;
};

export type InventarioExportSummary = {
  productos: number;
  unidades: number;
  valorCosto: number;
  valorVenta: number;
  stockBajo: number;
};

export function buildInventarioExport(
  productos: InventarioProductoRow[],
): { rows: InventarioExportRow[]; summary: InventarioExportSummary } {
  const rows = [...productos]
    .sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
    )
    .map((p): InventarioExportRow => {
      const costo = p.precio;
      const venta = p.costo ?? 0;
      const stockBajo = p.stock <= p.stock_minimo;
      return {
        id: p.id,
        nombre: p.nombre,
        sku: p.sku,
        categoria: p.inventario_categorias?.nombre ?? "—",
        costo,
        venta,
        stock: p.stock,
        stockMinimo: p.stock_minimo,
        stockBajo,
        activo: p.activo,
        estado: p.activo ? "Activo" : "Inactivo",
        descripcion: p.descripcion?.trim() || "",
        modelosCompatibles: (p.compatible_modelos ?? []).join(", "),
        imagenPath: p.imagen_url,
      };
    });

  let unidades = 0;
  let valorCosto = 0;
  let valorVenta = 0;
  let stockBajo = 0;
  for (const row of rows) {
    unidades += row.stock;
    valorCosto += row.costo * row.stock;
    valorVenta += row.venta * row.stock;
    if (row.stockBajo) stockBajo += 1;
  }

  return {
    rows,
    summary: {
      productos: rows.length,
      unidades,
      valorCosto,
      valorVenta,
      stockBajo,
    },
  };
}

export function inventarioExportFilename(ext: "pdf" | "xlsx", date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `inventario-${y}-${m}-${d}.${ext}`;
}
