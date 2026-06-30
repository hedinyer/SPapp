"use client";

import JsBarcode from "jsbarcode";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import type { InventarioProductoRow } from "@/lib/pipeline/types";
import {
  buildPriceLabelHtml,
  ROW_HEIGHT_MM,
  ROW_WIDTH_MM,
  toPriceLabelData,
} from "@/lib/printing/price-label";
import { Button } from "@/components/ui/button";

interface PrintPriceLabelButtonProps {
  product: InventarioProductoRow;
  copies?: number;
  variant?: "icon" | "outline";
  className?: string;
}

/**
 * Imprime etiquetas de 30×20 mm en rollo horizontal de 3 columnas con 4 mm de separación.
 * Papel en driver: 106×28 mm. En el diálogo: márgenes Ninguno, escala 100 %.
 */
export function PrintPriceLabelButton({
  product,
  copies = 1,
  variant = "icon",
  className,
}: PrintPriceLabelButtonProps) {
  function handlePrint() {
    const data = toPriceLabelData(product);
    const count = Math.max(1, copies);

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    Object.assign(iframe.style, {
      position: "fixed",
      left: "0",
      top: "0",
      width: `${ROW_WIDTH_MM}mm`,
      height: `${ROW_HEIGHT_MM}mm`,
      border: "0",
      opacity: "0",
      pointerEvents: "none",
      zIndex: "-1",
    });
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) {
      iframe.remove();
      toast.error("No se pudo preparar la impresión.");
      return;
    }

    doc.open();
    doc.write(buildPriceLabelHtml(data, count));
    doc.close();

    for (let index = 0; index < count; index += 1) {
      const svg = doc.getElementById(`barcode-${index}`);
      if (!svg) continue;

      try {
        JsBarcode(svg, data.sku, {
          format: "CODE128",
          width: 1,
          height: 20,
          displayValue: false,
          margin: 0,
        });
      } catch {
        iframe.remove();
        toast.error("No se pudo generar el código de barras del SKU.");
        return;
      }
    }

    const cleanup = () => {
      iframe.remove();
    };

    win.onafterprint = cleanup;

    win.focus();
    window.setTimeout(() => {
      try {
        win.print();
      } catch {
        cleanup();
        toast.error("No se pudo abrir el diálogo de impresión.");
      }
    }, 250);

    window.setTimeout(cleanup, 60_000);
  }

  if (variant === "outline") {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className}
        onClick={handlePrint}
      >
        <Printer className="mr-1 h-4 w-4" />
        Imprimir
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      aria-label="Imprimir etiqueta de precio"
      onClick={handlePrint}
    >
      <Printer className="h-4 w-4" />
    </Button>
  );
}
