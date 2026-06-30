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

export function labelSlotLeftMm(slot: number): number {
  return LABEL_GAP_MM + slot * (LABEL_WIDTH_MM + LABEL_GAP_MM);
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

function labelCellHtml(
  data: PriceLabelData,
  index: number,
  column: number,
): string {
  const left = labelSlotLeftMm(column);

  return `
    <div
      class="label"
      style="left:${left}mm;top:${LABEL_GAP_MM}mm;"
    >
      <div class="name">${escapeHtml(data.nombre)}</div>
      <svg id="barcode-${index}"></svg>
      <div class="price">${escapeHtml(data.precioFormatted)}</div>
    </div>
  `;
}

function rowHtml(
  data: PriceLabelData,
  startIndex: number,
  labelsInRow: number,
): string {
  const labels = Array.from({ length: labelsInRow }, (_, column) =>
    labelCellHtml(data, startIndex + column, column),
  ).join("");

  return `<div class="sheet">${labels}</div>`;
}

export function buildPriceLabelHtml(
  data: PriceLabelData,
  copies = 1,
): string {
  const count = Math.max(1, copies);
  const sheets: string[] = [];

  for (let index = 0; index < count; index += LABELS_PER_ROW) {
    const labelsInRow = Math.min(LABELS_PER_ROW, count - index);
    sheets.push(rowHtml(data, index, labelsInRow));
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=${ROW_WIDTH_MM}mm, height=${ROW_HEIGHT_MM}mm">
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
    html {
      width: ${ROW_WIDTH_MM}mm;
      height: ${ROW_HEIGHT_MM}mm;
    }
    body {
      width: ${ROW_WIDTH_MM}mm;
      height: ${ROW_HEIGHT_MM}mm;
      margin: 0;
      padding: 0;
      overflow: hidden;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      background: #fff;
    }
    .sheet {
      position: relative;
      width: ${ROW_WIDTH_MM}mm;
      height: ${ROW_HEIGHT_MM}mm;
      margin: 0;
      padding: 0;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
    }
    .sheet:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .label {
      position: absolute;
      width: ${LABEL_WIDTH_MM}mm;
      height: ${LABEL_HEIGHT_MM}mm;
      padding: 0.5mm 1mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      overflow: hidden;
      transform: rotate(0deg);
      transform-origin: top left;
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
      width: 26mm;
      max-width: 26mm;
      height: 7mm;
      max-height: 7mm;
    }
    .price {
      font-size: 7pt;
      font-weight: bold;
      text-align: center;
      line-height: 1;
    }
    @media print {
      @page {
        size: ${ROW_WIDTH_MM}mm ${ROW_HEIGHT_MM}mm;
        margin: 0;
      }
      html, body {
        width: ${ROW_WIDTH_MM}mm !important;
        height: ${ROW_HEIGHT_MM}mm !important;
        min-width: ${ROW_WIDTH_MM}mm !important;
        max-width: ${ROW_WIDTH_MM}mm !important;
        min-height: ${ROW_HEIGHT_MM}mm !important;
        max-height: ${ROW_HEIGHT_MM}mm !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        transform: none !important;
      }
      .sheet {
        width: ${ROW_WIDTH_MM}mm !important;
        height: ${ROW_HEIGHT_MM}mm !important;
        margin: 0 !important;
        padding: 0 !important;
        transform: none !important;
      }
      .label {
        transform: rotate(0deg) !important;
        transform-origin: top left !important;
      }
    }
  </style>
</head>
<body>
  ${sheets.join("")}
</body>
</html>`;
}
