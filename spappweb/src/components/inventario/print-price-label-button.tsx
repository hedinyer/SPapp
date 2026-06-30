"use client";

import JsBarcode from "jsbarcode";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import type { InventarioProductoRow } from "@/lib/pipeline/types";
import {
  buildPriceLabelHtml,
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
 * Tamaño de página por fila: 106×28 mm (configurar así en el driver iDPRT/HPRT).
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
    const popup = window.open("", "_blank", "width=200,height=150");

    if (!popup) {
      toast.error("Permite ventanas emergentes para imprimir.");
      return;
    }

    popup.document.open();
    popup.document.write(buildPriceLabelHtml(data, count));
    popup.document.close();

    for (let index = 0; index < count; index += 1) {
      const svg = popup.document.getElementById(`barcode-${index}`);
      if (!svg) continue;

      try {
        JsBarcode(svg, data.sku, {
          format: "CODE128",
          width: 1,
          height: 24,
          displayValue: false,
          margin: 0,
        });
      } catch {
        toast.error("No se pudo generar el código de barras del SKU.");
        popup.close();
        return;
      }
    }

    popup.focus();
    window.setTimeout(() => {
      popup.print();
      popup.onafterprint = () => popup.close();
    }, 150);
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
