import { pdf } from "@react-pdf/renderer";
import type { InventarioProductoRow } from "@/lib/pipeline/types";
import {
  buildInventarioExport,
  inventarioExportFilename,
  type InventarioExportRow,
} from "@/lib/printing/inventario-export";
import { InventarioPdfDoc } from "@/lib/printing/inventario-pdf";
import { EMPRESA_PROPIETARIA } from "@/lib/contracts/contrato-renting-clausulas";
import { getStoragePublicUrl } from "@/lib/utils/storage-urls";
import { STORAGE_BUCKETS } from "@/lib/supabase/storage-buckets";

const PHOTO_SIZE = 240;
const GARRIDO_LOGO = "/logosolucionesgarrido.jpg";
const BERA_LOGO = "/beralogo.jpg";

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function fetchAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar ${url}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(blob);
  });
}

/** Recorte cuadrado cover → JPEG data URL. Si falla, null. */
async function squareJpegDataUrl(
  url: string,
  size = PHOTO_SIZE,
): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }
    const scale = Math.max(size / bitmap.width, size / bitmap.height);
    const w = bitmap.width * scale;
    const h = bitmap.height * scale;
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.88);
  } catch {
    return null;
  }
}

function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.split(",")[1] ?? "";
}

async function loadProductPhotos(
  rows: InventarioExportRow[],
): Promise<Record<number, string>> {
  const entries = await Promise.all(
    rows.map(async (row) => {
      const url = getStoragePublicUrl(
        STORAGE_BUCKETS.inventarioImagenes,
        row.imagenPath,
      );
      if (!url) return [row.id, null] as const;
      const dataUrl = await squareJpegDataUrl(url);
      return [row.id, dataUrl] as const;
    }),
  );
  const map: Record<number, string> = {};
  for (const [id, src] of entries) {
    if (src) map[id] = src;
  }
  return map;
}

function fechaLabel(date = new Date()): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export async function downloadInventarioPdf(
  productos: InventarioProductoRow[],
): Promise<void> {
  const { rows, summary } = buildInventarioExport(productos);
  const [garridoLogoSrc, beraLogoSrc, photoSrcById] = await Promise.all([
    fetchAsDataUrl(GARRIDO_LOGO),
    fetchAsDataUrl(BERA_LOGO),
    loadProductPhotos(rows),
  ]);

  const doc = (
    <InventarioPdfDoc
      rows={rows}
      summary={summary}
      fechaLabel={fechaLabel()}
      empresa={EMPRESA_PROPIETARIA.razonSocial}
      garridoLogoSrc={garridoLogoSrc}
      beraLogoSrc={beraLogoSrc}
      photoSrcById={photoSrcById}
    />
  );
  const blob = await pdf(doc).toBlob();
  downloadBlob(blob, inventarioExportFilename("pdf"));
}

export async function downloadInventarioXlsx(
  productos: InventarioProductoRow[],
): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const { rows, summary } = buildInventarioExport(productos);
  const [garridoLogoSrc, beraLogoSrc, photoSrcById] = await Promise.all([
    fetchAsDataUrl(GARRIDO_LOGO),
    fetchAsDataUrl(BERA_LOGO),
    loadProductPhotos(rows),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = EMPRESA_PROPIETARIA.razonSocial;
  wb.created = new Date();
  const ws = wb.addWorksheet("Inventario", {
    views: [{ state: "frozen", ySplit: 8 }],
  });

  ws.columns = [
    { key: "foto", width: 14 },
    { key: "nombre", width: 32 },
    { key: "sku", width: 14 },
    { key: "categoria", width: 20 },
    { key: "costo", width: 14 },
    { key: "venta", width: 14 },
    { key: "stock", width: 10 },
    { key: "stockMinimo", width: 10 },
    { key: "estado", width: 12 },
    { key: "descripcion", width: 36 },
    { key: "modelos", width: 28 },
  ];

  ws.mergeCells("A1:K1");
  const title = ws.getCell("A1");
  title.value = `Inventario de tienda — ${EMPRESA_PROPIETARIA.razonSocial}`;
  title.font = { bold: true, size: 16, color: { argb: "FF0F172A" } };
  title.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(1).height = 28;

  ws.mergeCells("A2:K2");
  ws.getCell("A2").value = fechaLabel();
  ws.getCell("A2").font = { size: 10, color: { argb: "FF64748B" } };

  const garridoId = wb.addImage({
    base64: dataUrlToBase64(garridoLogoSrc),
    extension: "jpeg",
  });
  const beraId = wb.addImage({
    base64: dataUrlToBase64(beraLogoSrc),
    extension: "jpeg",
  });
  ws.addImage(garridoId, {
    tl: { col: 0, row: 2.2 },
    ext: { width: 140, height: 40 },
  });
  ws.addImage(beraId, {
    tl: { col: 2.2, row: 2.2 },
    ext: { width: 120, height: 40 },
  });
  ws.getRow(3).height = 48;
  ws.getRow(4).height = 8;

  const summaryLabels = [
    ["Productos", summary.productos],
    ["Unidades", summary.unidades],
    ["Valor a costo", summary.valorCosto],
    ["Valor a venta", summary.valorVenta],
    ["Stock bajo", summary.stockBajo],
  ] as const;
  const summaryRow = ws.getRow(5);
  summaryLabels.forEach(([label], i) => {
    const cell = summaryRow.getCell(i + 1);
    cell.value = label;
    cell.font = { bold: true, size: 9, color: { argb: "FF64748B" } };
  });
  const valuesRow = ws.getRow(6);
  summaryLabels.forEach(([, value], i) => {
    const cell = valuesRow.getCell(i + 1);
    cell.value = value;
    cell.font = { bold: true, size: 12 };
    if (i === 2 || i === 3) {
      cell.numFmt = '"$"#,##0';
    }
  });
  valuesRow.getCell(5).font = {
    bold: true,
    size: 12,
    color: { argb: "FFB91C1C" },
  };

  ws.getRow(7).height = 8;

  const header = ws.getRow(8);
  const headers = [
    "Foto",
    "Producto",
    "Código",
    "Categoría",
    "Costo",
    "Venta",
    "Stock",
    "Mín.",
    "Estado",
    "Descripción",
    "Modelos compatibles",
  ];
  headers.forEach((h, i) => {
    const cell = header.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: "FFF8FAFC" }, size: 10 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  header.height = 22;

  const moneyFmt = '"$"#,##0';
  const startDataRow = 9;

  rows.forEach((row, index) => {
    const r = ws.getRow(startDataRow + index);
    r.height = 64;
    r.getCell(1).value = "";
    r.getCell(2).value = row.nombre;
    r.getCell(2).font = { bold: true, size: 11 };
    r.getCell(3).value = row.sku;
    r.getCell(4).value = row.categoria;
    r.getCell(5).value = row.costo;
    r.getCell(5).numFmt = moneyFmt;
    r.getCell(6).value = row.venta;
    r.getCell(6).numFmt = moneyFmt;
    r.getCell(7).value = row.stock;
    if (row.stockBajo) {
      r.getCell(7).font = { bold: true, color: { argb: "FFB91C1C" } };
    }
    r.getCell(8).value = row.stockMinimo;
    r.getCell(9).value = row.estado;
    r.getCell(9).font = {
      bold: true,
      color: { argb: row.activo ? "FF15803D" : "FF64748B" },
    };
    r.getCell(10).value = row.descripcion;
    r.getCell(11).value = row.modelosCompatibles;

    if (index % 2 === 1) {
      for (let c = 1; c <= 11; c++) {
        r.getCell(c).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }
    }

    const photo = photoSrcById[row.id];
    if (photo) {
      const imgId = wb.addImage({
        base64: dataUrlToBase64(photo),
        extension: "jpeg",
      });
      const excelRow = startDataRow + index - 1; // 0-based for addImage
      ws.addImage(imgId, {
        tl: { col: 0.15, row: excelRow + 0.15 },
        ext: { width: 72, height: 72 },
      });
    }

    r.alignment = { vertical: "middle", wrapText: true };
  });

  const totalRowIdx = startDataRow + rows.length;
  const total = ws.getRow(totalRowIdx);
  total.getCell(2).value = "TOTALES";
  total.getCell(2).font = { bold: true };
  total.getCell(5).value = summary.valorCosto;
  total.getCell(5).numFmt = moneyFmt;
  total.getCell(5).font = { bold: true };
  total.getCell(6).value = summary.valorVenta;
  total.getCell(6).numFmt = moneyFmt;
  total.getCell(6).font = { bold: true };
  total.getCell(7).value = summary.unidades;
  total.getCell(7).font = { bold: true };
  for (let c = 1; c <= 11; c++) {
    total.getCell(c).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, inventarioExportFilename("xlsx"));
}
