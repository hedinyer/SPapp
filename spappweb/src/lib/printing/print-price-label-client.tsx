import { pdf } from "@react-pdf/renderer";
import type { InventarioProductoRow } from "@/lib/pipeline/types";
import { PriceLabelPdfDoc } from "@/lib/printing/price-label-pdf";
import type { PriceLabelPrintOptions } from "@/lib/printing/price-label-print-options";
import { toPriceLabelData } from "@/lib/printing/price-label";

async function barcodeDataUrl(sku: string): Promise<string> {
  const JsBarcode = (await import("jsbarcode")).default;
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, sku, {
    format: "CODE128",
    width: 1.5,
    height: 72,
    displayValue: false,
    margin: 0,
  });
  return canvas.toDataURL("image/png");
}

export async function buildPriceLabelPdfBlob(
  product: InventarioProductoRow,
  options: PriceLabelPrintOptions,
): Promise<Blob> {
  const data = toPriceLabelData(product);
  const barcodeSrc = await barcodeDataUrl(data.sku);
  const doc = (
    <PriceLabelPdfDoc data={data} barcodeSrc={barcodeSrc} options={options} />
  );
  return pdf(doc).toBlob();
}

export function openPdfPreview(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    URL.revokeObjectURL(url);
    throw new Error("Permite ventanas emergentes para la vista previa.");
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

export function printPdfBlob(blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement("iframe");
    Object.assign(iframe.style, {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "0",
      height: "0",
      border: "0",
    });
    document.body.appendChild(iframe);

    const cleanup = () => {
      URL.revokeObjectURL(url);
      iframe.remove();
    };

    iframe.onerror = () => {
      cleanup();
      reject(new Error("No se pudo abrir el diálogo de impresión."));
    };

    iframe.onload = () => {
      const win = iframe.contentWindow;
      if (!win) {
        cleanup();
        reject(new Error("No se pudo abrir el diálogo de impresión."));
        return;
      }

      win.onafterprint = () => {
        cleanup();
        resolve();
      };

      win.focus();
      win.print();
      window.setTimeout(cleanup, 120_000);
    };

    iframe.src = url;
  });
}

export async function printPriceLabelInBrowser(
  product: InventarioProductoRow,
  options: PriceLabelPrintOptions,
  mode: "preview" | "print",
): Promise<void> {
  const blob = await buildPriceLabelPdfBlob(product, options);
  if (mode === "preview") {
    openPdfPreview(blob);
    return;
  }
  await printPdfBlob(blob);
}
