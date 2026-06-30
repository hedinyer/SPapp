"use client";

import { useTransition } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { printPriceLabel } from "@/lib/actions/label-print-actions";
import type { InventarioProductoRow } from "@/lib/pipeline/types";
import { Button } from "@/components/ui/button";

interface PrintPriceLabelButtonProps {
  product: InventarioProductoRow;
  copies?: number;
  variant?: "icon" | "outline";
  className?: string;
}

function downloadZpl(zpl: string, sku: string) {
  const blob = new Blob([zpl], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `etiqueta-${sku}.zpl`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function PrintPriceLabelButton({
  product,
  copies = 1,
  variant = "icon",
  className,
}: PrintPriceLabelButtonProps) {
  const [pending, startTransition] = useTransition();

  function handlePrint() {
    startTransition(async () => {
      try {
        const result = await printPriceLabel(product.id, copies);

        if (result.method === "direct") {
          toast.success("Etiqueta enviada a la impresora.");
          return;
        }

        downloadZpl(result.zpl, result.sku);
        toast.success(
          "Archivo ZPL descargado. Ábrelo con la iF4 o configura LABEL_PRINTER_NAME en el servidor local.",
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo imprimir.");
      }
    });
  }

  if (variant === "outline") {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className}
        disabled={pending}
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
      disabled={pending}
      aria-label="Imprimir etiqueta de precio"
      onClick={handlePrint}
    >
      <Printer className="h-4 w-4" />
    </Button>
  );
}
