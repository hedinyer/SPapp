import { pdf } from "@react-pdf/renderer";
import type { InventarioProductoRow } from "@/lib/pipeline/types";
import { PriceLabelPdfDoc } from "@/lib/printing/price-label-pdf";
import { toPriceLabelData } from "@/lib/printing/price-label";

async function barcodeDataUrl(sku: string): Promise<string> {
  const JsBarcode = (await import("jsbarcode")).default;
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, sku, {
    format: "CODE128",
    width: 1,
    height: 40,
    displayValue: false,
    margin: 0,
  });
  return canvas.toDataURL("image/png");
}

function printPdfBlob(blob: Blob): Promise<void> {
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
      reject(new Error("No se pudo abrir la vista de impresión."));
    };

    iframe.onload = () => {
      const win = iframe.contentWindow;
      if (!win) {
        cleanup();
        reject(new Error("No se pudo abrir la vista de impresión."));
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
): Promise<void> {
  const data = toPriceLabelData(product);
  const barcodeSrc = await barcodeDataUrl(data.sku);
  const doc = (
    <PriceLabelPdfDoc data={data} barcodeSrc={barcodeSrc} slot={0} />
  );
  const blob = await pdf(doc).toBlob();
  await printPdfBlob(blob);
}
