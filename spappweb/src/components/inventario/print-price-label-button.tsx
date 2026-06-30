"use client";

import { useTransition } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { printPriceLabelInBrowser } from "@/lib/printing/print-price-label-client";
import type { InventarioProductoRow } from "@/lib/pipeline/types";
import { Button } from "@/components/ui/button";

interface PrintPriceLabelButtonProps {
  product: InventarioProductoRow;
  copies?: number;
  variant?: "icon" | "outline";
  className?: string;
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
        await printPriceLabelInBrowser(product);
        toast.success(
          "En el diálogo: iF4, escala 100 %, márgenes ninguno, papel 106×28 mm.",
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
