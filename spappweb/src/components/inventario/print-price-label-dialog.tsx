"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { InventarioProductoRow } from "@/lib/pipeline/types";
import {
  applyPaperPreset,
  DEFAULT_PRINT_OPTIONS,
  type PaperPreset,
  type PriceLabelPrintOptions,
} from "@/lib/printing/price-label-print-options";
import { printPriceLabelInBrowser } from "@/lib/printing/print-price-label-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TouchSelect } from "@/components/ui/touch-select";

interface PrintPriceLabelDialogProps {
  product: InventarioProductoRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function num(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function PrintPriceLabelDialog({
  product,
  open,
  onOpenChange,
}: PrintPriceLabelDialogProps) {
  const [options, setOptions] =
    useState<PriceLabelPrintOptions>(DEFAULT_PRINT_OPTIONS);
  const [pending, startTransition] = useTransition();

  function patch(partial: Partial<PriceLabelPrintOptions>) {
    setOptions((prev) => ({ ...prev, ...partial }));
  }

  function onPresetChange(value: string) {
    const preset = value as PaperPreset;
    setOptions((prev) => applyPaperPreset(preset, prev));
  }

  function run(mode: "preview" | "print") {
    if (!product) return;
    startTransition(async () => {
      try {
        await printPriceLabelInBrowser(product, options, mode);
        if (mode === "preview") {
          toast.success(
            "Vista previa abierta. Usa Ctrl+P para más opciones del navegador.",
          );
        } else {
          toast.success(
            "En el diálogo del sistema: impresora, tamaño, márgenes, escala y copias.",
          );
        }
        onOpenChange(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo imprimir.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Imprimir etiqueta</DialogTitle>
          {product ? (
            <p className="text-sm text-neutral-500">
              {product.nombre} · SKU {product.sku}
            </p>
          ) : null}
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Tamaño de hoja</Label>
            <TouchSelect
              aria-label="Tamaño de hoja"
              value={options.preset}
              onChange={onPresetChange}
              options={[
                { value: "row", label: "Fila 3 etiquetas (106 × 28 mm)" },
                { value: "single", label: "Una etiqueta (38 × 28 mm)" },
                { value: "custom", label: "Personalizado" },
              ]}
            />
          </div>

          {options.preset === "custom" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="page-width">Ancho hoja (mm)</Label>
                <Input
                  id="page-width"
                  type="number"
                  min={20}
                  max={300}
                  step={0.1}
                  value={options.pageWidthMm}
                  onChange={(e) =>
                    patch({ pageWidthMm: num(e.target.value, options.pageWidthMm) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="page-height">Alto hoja (mm)</Label>
                <Input
                  id="page-height"
                  type="number"
                  min={10}
                  max={300}
                  step={0.1}
                  value={options.pageHeightMm}
                  onChange={(e) =>
                    patch({
                      pageHeightMm: num(e.target.value, options.pageHeightMm),
                    })
                  }
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-neutral-500 sm:col-span-2">
              Hoja: {options.pageWidthMm} × {options.pageHeightMm} mm
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="margin-top">Margen superior (mm)</Label>
            <Input
              id="margin-top"
              type="number"
              min={0}
              max={50}
              step={0.5}
              value={options.marginTopMm}
              onChange={(e) =>
                patch({ marginTopMm: num(e.target.value, options.marginTopMm) })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="margin-bottom">Margen inferior (mm)</Label>
            <Input
              id="margin-bottom"
              type="number"
              min={0}
              max={50}
              step={0.5}
              value={options.marginBottomMm}
              onChange={(e) =>
                patch({
                  marginBottomMm: num(e.target.value, options.marginBottomMm),
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="margin-left">Margen izquierdo (mm)</Label>
            <Input
              id="margin-left"
              type="number"
              min={0}
              max={50}
              step={0.5}
              value={options.marginLeftMm}
              onChange={(e) =>
                patch({ marginLeftMm: num(e.target.value, options.marginLeftMm) })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="margin-right">Margen derecho (mm)</Label>
            <Input
              id="margin-right"
              type="number"
              min={0}
              max={50}
              step={0.5}
              value={options.marginRightMm}
              onChange={(e) =>
                patch({
                  marginRightMm: num(e.target.value, options.marginRightMm),
                })
              }
            />
          </div>

          {options.preset !== "single" ? (
            <div className="space-y-2 sm:col-span-2">
              <Label>Columna en el rollo</Label>
              <TouchSelect
                aria-label="Columna en el rollo"
                value={String(options.slot)}
                onChange={(value) =>
                  patch({ slot: Number(value) as 0 | 1 | 2 })
                }
                options={[
                  { value: "0", label: "1 · izquierda" },
                  { value: "1", label: "2 · centro" },
                  { value: "2", label: "3 · derecha" },
                ]}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="offset-x">Ajuste horizontal (mm)</Label>
            <Input
              id="offset-x"
              type="number"
              min={-20}
              max={20}
              step={0.5}
              value={options.offsetXmm}
              onChange={(e) =>
                patch({ offsetXmm: num(e.target.value, options.offsetXmm) })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offset-y">Ajuste vertical (mm)</Label>
            <Input
              id="offset-y"
              type="number"
              min={-20}
              max={20}
              step={0.5}
              value={options.offsetYmm}
              onChange={(e) =>
                patch({ offsetYmm: num(e.target.value, options.offsetYmm) })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="copies">Copias en PDF</Label>
            <Input
              id="copies"
              type="number"
              min={1}
              max={99}
              value={options.copies}
              onChange={(e) =>
                patch({ copies: Math.max(1, Math.min(99, num(e.target.value, 1))) })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Escala del contenido</Label>
            <TouchSelect
              aria-label="Escala del contenido"
              value={String(options.contentScale)}
              onChange={(value) => patch({ contentScale: Number(value) })}
              options={[
                { value: "0.85", label: "85 %" },
                { value: "1", label: "100 %" },
                { value: "1.15", label: "115 %" },
              ]}
            />
          </div>
        </div>

        <p className="text-xs text-neutral-500">
          Después verás el diálogo del navegador o del sistema con impresora,
          escala, orientación y más ajustes. En Chrome usa «Más opciones».
        </p>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            disabled={pending || !product}
            onClick={() => run("preview")}
          >
            Vista previa
          </Button>
          <Button
            type="button"
            className="bg-black text-white hover:bg-neutral-800"
            disabled={pending || !product}
            onClick={() => run("print")}
          >
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
