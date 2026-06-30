import type { InventarioProductoRow } from "@/lib/pipeline/types";
import { formatCop } from "@/lib/utils/format";

export const LABEL_WIDTH_MM = 30;
export const LABEL_HEIGHT_MM = 20;
export const LABEL_GAP_MM = 4;
export const LABELS_PER_ROW = 3;
export const ROW_WIDTH_MM =
  LABEL_GAP_MM * 2 +
  LABELS_PER_ROW * LABEL_WIDTH_MM +
  (LABELS_PER_ROW - 1) * LABEL_GAP_MM;
export const ROW_HEIGHT_MM = LABEL_GAP_MM * 2 + LABEL_HEIGHT_MM;
const LABEL_DPI = 203;

export interface PriceLabelData {
  nombre: string;
  sku: string;
  precioFormatted: string;
}

export function mmToDots(mm: number): number {
  return Math.round((mm * LABEL_DPI) / 25.4);
}

export function labelSlotLeftMm(slot: number): number {
  return LABEL_GAP_MM + slot * (LABEL_WIDTH_MM + LABEL_GAP_MM);
}

function escapeZpl(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\^/g, "\\^");
}

export function toPriceLabelData(
  product: InventarioProductoRow,
): PriceLabelData {
  const nombre =
    product.nombre.length > 18
      ? `${product.nombre.slice(0, 17)}…`
      : product.nombre;

  return {
    nombre,
    sku: product.sku,
    precioFormatted: formatCop(product.precio),
  };
}

function buildLabelFields(data: PriceLabelData, slot: number): string {
  const x = mmToDots(labelSlotLeftMm(slot)) + 8;
  const y = mmToDots(LABEL_GAP_MM) + 4;
  const nombre = escapeZpl(data.nombre);
  const sku = escapeZpl(data.sku);
  const precio = escapeZpl(data.precioFormatted);

  return `^FO${x},${y}^A0N,18,18^FD${nombre}^FS
^FO${x},${y + 28}^BY1^BCN,40,N,N,N^FD${sku}^FS
^FO${x},${y + 82}^A0N,26,26^FD${precio}^FS
`;
}

function buildZplRow(data: PriceLabelData, labelsInRow: number): string {
  const fields = Array.from({ length: labelsInRow }, (_, slot) =>
    buildLabelFields(data, slot),
  ).join("");

  return `^XA
^PW${mmToDots(ROW_WIDTH_MM)}
^LL${mmToDots(ROW_HEIGHT_MM)}
^LH0,0
^CI28
${fields}^XZ`;
}

export function buildPriceLabelZpl(
  data: PriceLabelData,
  copies = 1,
): string {
  const count = Math.max(1, copies);
  const rows: string[] = [];

  for (let index = 0; index < count; index += LABELS_PER_ROW) {
    const labelsInRow = Math.min(LABELS_PER_ROW, count - index);
    rows.push(buildZplRow(data, labelsInRow));
  }

  return rows.join("\n");
}
