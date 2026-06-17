"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  cancelCompra,
  markDelivered,
  updateDelivery,
} from "@/lib/actions/admin-actions";
import type { UserMotoCompraRow } from "@/lib/pipeline/types";
import { formatDateOnly } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DeliveryPanelProps {
  compra: UserMotoCompraRow | null;
  userId: number;
}

export function DeliveryPanel({ compra, userId }: DeliveryPanelProps) {
  const [pending, startTransition] = useTransition();

  if (!compra) {
    return (
      <Card className="border-neutral-200 shadow-none">
        <CardContent className="py-8 text-center text-sm text-neutral-500">
          Aún no hay moto seleccionada.
        </CardContent>
      </Card>
    );
  }

  if (compra.estado === "entregada") {
    return (
      <Card className="border-neutral-200 shadow-none">
        <CardContent className="space-y-2 py-8 text-center text-sm">
          <p className="font-medium">Moto entregada</p>
          {compra.placa && <p>Placa: {compra.placa}</p>}
          {compra.fecha_entrega && (
            <p>Fecha: {formatDateOnly(compra.fecha_entrega)}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (compra.estado === "cancelada") {
    return (
      <Card className="border-neutral-200 shadow-none">
        <CardContent className="py-8 text-center text-sm text-neutral-500">
          Compra cancelada.
        </CardContent>
      </Card>
    );
  }

  if (compra.estado === "pendiente_pago") {
    return (
      <Card className="border-neutral-200 shadow-none">
        <CardContent className="py-8 text-center text-sm text-neutral-500">
          Confirma los pagos antes de preparar el retiro.
        </CardContent>
      </Card>
    );
  }

  function run(action: () => Promise<unknown>, success: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(success);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al guardar.");
      }
    });
  }

  return (
    <Card className="border-neutral-200 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">Retiro y entrega</CardTitle>
        <p className="text-sm text-neutral-500">
          Registra los datos de la moto y marca como entregada.
        </p>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            run(
              () =>
                updateDelivery({
                  compraId: compra.id,
                  userId,
                  placa: String(fd.get("placa")),
                  chasis: String(fd.get("chasis")),
                  referencia: String(fd.get("referencia") || ""),
                  fechaEntrega: String(fd.get("fechaEntrega")),
                }),
              "Datos de retiro guardados.",
            );
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="placa">Placa</Label>
              <Input
                id="placa"
                name="placa"
                defaultValue={compra.placa ?? ""}
                required
                placeholder="ABC123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chasis">Chasis</Label>
              <Input
                id="chasis"
                name="chasis"
                defaultValue={compra.chasis ?? ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referencia">Referencia (opcional)</Label>
              <Input
                id="referencia"
                name="referencia"
                defaultValue={compra.referencia ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fechaEntrega">Fecha de entrega</Label>
              <Input
                id="fechaEntrega"
                name="fechaEntrega"
                type="date"
                required
                defaultValue={
                  compra.fecha_entrega
                    ? compra.fecha_entrega.slice(0, 10)
                    : undefined
                }
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
            <Button
              type="submit"
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
              disabled={pending}
            >
              Guardar datos
            </Button>
            <Button
              type="button"
              size="lg"
              className="w-full bg-black text-white hover:bg-neutral-800 sm:w-auto"
              disabled={pending || !compra.placa}
              onClick={() =>
                run(
                  () => markDelivered(compra.id, userId),
                  "Moto entregada. Agenda la visita domiciliaria abajo.",
                )
              }
            >
              Marcar entregada
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full sm:w-auto"
                  disabled={pending}
                >
                  Cancelar compra
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-white">
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Cancelar compra?</AlertDialogTitle>
                  <AlertDialogDescription>
                    El cliente verá la selección cancelada en la app.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Volver</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      run(
                        () => cancelCompra(compra.id, userId),
                        "Compra cancelada.",
                      )
                    }
                  >
                    Sí, cancelar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
