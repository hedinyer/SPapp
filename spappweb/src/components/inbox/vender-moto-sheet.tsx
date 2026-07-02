"use client";

import { useState, useTransition } from "react";
import { Bike, Printer } from "lucide-react";
import { toast } from "sonner";
import { saveVentaMoto } from "@/lib/actions/venta-moto-actions";
import { printVentaMotoReceipt } from "@/lib/printing/venta-moto-receipt";
import type { BikeRow } from "@/lib/pipeline/types";
import { formatCop } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TouchSelect } from "@/components/ui/touch-select";

interface VenderMotoSheetProps {
  bikes: BikeRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VenderMotoSheet({
  bikes,
  open,
  onOpenChange,
}: VenderMotoSheetProps) {
  const [pending, startTransition] = useTransition();
  const [bikeId, setBikeId] = useState("");
  const activeBikes = bikes.filter((b) => b.activo);
  const selected = activeBikes.find((b) => String(b.id) === bikeId);

  function resetForm() {
    setBikeId("");
  }

  function onBikeChange(id: string) {
    setBikeId(id);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <SheetContent side="right" className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bike className="h-5 w-5" />
            Vender moto
          </SheetTitle>
        </SheetHeader>

        <form
          id="vender-moto-form"
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const parsedBikeId = bikeId ? Number(bikeId) : undefined;

            startTransition(async () => {
              try {
                const venta = await saveVentaMoto({
                  bikeId: parsedBikeId,
                  modelo: selected?.modelo ?? String(fd.get("modelo")),
                  color: selected?.color ?? String(fd.get("color")),
                  clienteNombre: String(fd.get("clienteNombre")),
                  clienteCedula: String(fd.get("clienteCedula")),
                  clienteCelular: String(fd.get("clienteCelular")),
                  chasis: String(fd.get("chasis") || "") || undefined,
                  cuotaInicial: selected?.cuota_inicial,
                  notas: String(fd.get("notas") || "") || undefined,
                });
                await printVentaMotoReceipt(venta);
                toast.success("Venta guardada e impresa.");
                resetForm();
                onOpenChange(false);
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : "No se pudo guardar.",
                );
              }
            });
          }}
        >
          <div className="space-y-2">
            <Label>Moto del catálogo</Label>
            <TouchSelect
              value={bikeId}
              onChange={onBikeChange}
              placeholder="Selecciona modelo y color"
              options={activeBikes.map((b) => ({
                value: String(b.id),
                label: `${b.modelo} — ${b.color} (stock ${b.stock})`,
              }))}
            />
            {selected && (
              <p className="text-sm text-neutral-500">
                Cuota inicial: {formatCop(selected.cuota_inicial)}
              </p>
            )}
          </div>

          {!selected && (
            <>
              <div className="space-y-2">
                <Label htmlFor="modelo">Modelo</Label>
                <Input id="modelo" name="modelo" required={!selected} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input id="color" name="color" required={!selected} />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="clienteNombre">Nombre del cliente</Label>
            <Input id="clienteNombre" name="clienteNombre" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="clienteCedula">Cédula</Label>
              <Input
                id="clienteCedula"
                name="clienteCedula"
                inputMode="numeric"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clienteCelular">Celular</Label>
              <Input
                id="clienteCelular"
                name="clienteCelular"
                inputMode="tel"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="chasis">Chasis</Label>
            <Input id="chasis" name="chasis" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Input id="notas" name="notas" />
          </div>
        </form>

        <SheetFooter className="mt-6">
          <Button
            type="submit"
            form="vender-moto-form"
            disabled={pending}
            className="w-full gap-2"
          >
            <Printer className="h-4 w-4" />
            {pending ? "Guardando…" : "Guardar e imprimir"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
