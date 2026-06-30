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

export interface PriceLabelData {
  nombre: string;
  sku: string;
  precioFormatted: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function labelCellHtml(data: PriceLabelData, index: number): string {
  return `
    <div class="label">
      <div class="name">${escapeHtml(data.nombre)}</div>
      <svg id="barcode-${index}"></svg>
      <div class="price">${escapeHtml(data.precioFormatted)}</div>
    </div>
  `;
}

function emptyCellHtml(): string {
  return `<div class="label label--empty" aria-hidden="true"></div>`;
}

function rowHtml(
  data: PriceLabelData,
  startIndex: number,
  labelsInRow: number,
): string {
  const cells = Array.from({ length: LABELS_PER_ROW }, (_, column) => {
    if (column < labelsInRow) {
      return labelCellHtml(data, startIndex + column);
    }
    return emptyCellHtml();
  }).join("");

  return `<div class="row">${cells}</div>`;
}

export function buildPriceLabelHtml(
  data: PriceLabelData,
  copies = 1,
): string {
  const count = Math.max(1, copies);
  const rows: string[] = [];

  for (let index = 0; index < count; index += LABELS_PER_ROW) {
    const labelsInRow = Math.min(LABELS_PER_ROW, count - index);
    rows.push(rowHtml(data, index, labelsInRow));
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Etiqueta ${escapeHtml(data.sku)}</title>
  <style>
    @page {
      size: ${ROW_WIDTH_MM}mm ${ROW_HEIGHT_MM}mm;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: ${ROW_WIDTH_MM}mm;
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .row {
      width: ${ROW_WIDTH_MM}mm;
      height: ${ROW_HEIGHT_MM}mm;
      padding: ${LABEL_GAP_MM}mm;
      display: grid;
      grid-template-columns: repeat(${LABELS_PER_ROW}, ${LABEL_WIDTH_MM}mm);
      column-gap: ${LABEL_GAP_MM}mm;
      page-break-inside: avoid;
    }
    .row + .row {
      page-break-before: always;
    }
    .label {
      width: ${LABEL_WIDTH_MM}mm;
      height: ${LABEL_HEIGHT_MM}mm;
      padding: 0.5mm 1mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      overflow: hidden;
    }
    .label--empty {
      visibility: hidden;
    }
    .name {
      font-size: 5pt;
      line-height: 1.1;
      text-align: center;
      width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    svg {
      max-width: 28mm;
      max-height: 8mm;
      height: 8mm;
    }
    .price {
      font-size: 7pt;
      font-weight: bold;
      text-align: center;
    }
    @media print {
      html, body {
        margin: 0;
      }
    }
  </style>
</head>
<body>
  ${rows.join("")}
</body>
</html>`;
}
