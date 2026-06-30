import type { InventarioProductoRow } from "@/lib/pipeline/types";
import { formatCop } from "@/lib/utils/format";

export const LABEL_WIDTH_MM = 30;
export const LABEL_HEIGHT_MM = 20;

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

function singleLabelHtml(data: PriceLabelData, index: number): string {
  const pageBreak =
    index > 0 ? ' style="page-break-before: always;"' : "";

  return `
    <div class="label"${pageBreak}>
      <div class="name">${escapeHtml(data.nombre)}</div>
      <svg id="barcode-${index}"></svg>
      <div class="price">${escapeHtml(data.precioFormatted)}</div>
    </div>
  `;
}

export function buildPriceLabelHtml(
  data: PriceLabelData,
  copies = 1,
): string {
  const count = Math.max(1, copies);
  const labels = Array.from({ length: count }, (_, index) =>
    singleLabelHtml(data, index),
  ).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Etiqueta ${escapeHtml(data.sku)}</title>
  <style>
    @page {
      size: ${LABEL_WIDTH_MM}mm ${LABEL_HEIGHT_MM}mm;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: ${LABEL_WIDTH_MM}mm;
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
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
      .label {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  ${labels}
</body>
</html>`;
}
