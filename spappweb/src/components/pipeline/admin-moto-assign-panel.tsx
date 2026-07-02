"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { assignMotoByAdmin } from "@/lib/actions/admin-actions";
import type {
  BikeRow,
  FrecuenciaPago,
  UserMotoCompraRow,
} from "@/lib/pipeline/types";
import { FRECUENCIA_LABELS } from "@/lib/pipeline/types";
import { formatCop } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TouchSelect } from "@/components/ui/touch-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminMotoAssignPanelProps {
  compra: UserMotoCompraRow | null;
  bikes: BikeRow[];
  userId: number;
  documentId: number;
}

const FRECUENCIAS: FrecuenciaPago[] = [
  "diario",
  "semanal",
  "quincenal",
  "mensual",
];

export function AdminMotoAssignPanel({
  compra,
  bikes,
  userId,
  documentId,
}: AdminMotoAssignPanelProps) {
  const [pending, startTransition] = useTransition();
  const [bikeId, setBikeId] = useState(
    compra?.bike_id ? String(compra.bike_id) : "",
  );
  const [frecuencia, setFrecuencia] = useState<FrecuenciaPago>(
    compra?.frecuencia_pago ?? "semanal",
  );

  const activeBikes = bikes.filter((b) => b.activo);
  const selectedBike = activeBikes.find((b) => String(b.id) === bikeId);

  return (
    <Card className="border-neutral-200 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">Asignar moto y placa</CardTitle>
        <p className="text-sm text-neutral-500">
          Elige la moto del catálogo y registra el chasis. La placa es opcional.
        </p>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const parsedBikeId = Number(bikeId);
            if (!Number.isFinite(parsedBikeId) || parsedBikeId <= 0) {
              toast.error("Selecciona una moto.");
              return;
            }
            startTransition(async () => {
              try {
                await assignMotoByAdmin({
                  userId,
                  documentId,
                  bikeId: parsedBikeId,
                  frecuencia,
                  placa: String(fd.get("placa") || "").trim() || undefined,
                  chasis: String(fd.get("chasis")),
                  referencia: String(fd.get("referencia") || "") || undefined,
                });
                toast.success("Moto asignada. Envía el link de contrato al cliente.");
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : "Error al guardar.",
                );
              }
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Moto (modelo · color)</Label>
              <TouchSelect
                aria-label="Moto"
                value={bikeId}
                onChange={setBikeId}
                placeholder="Seleccionar moto"
                options={activeBikes.map((b) => ({
                  value: String(b.id),
                  label: `${b.modelo} · ${b.color} (stock ${b.stock})`,
                }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Frecuencia de pago</Label>
              <TouchSelect
                aria-label="Frecuencia"
                value={frecuencia}
                onChange={(v) => setFrecuencia(v as FrecuenciaPago)}
                options={FRECUENCIAS.map((f) => ({
                  value: f,
                  label: FRECUENCIA_LABELS[f],
                }))}
              />
            </div>
            {selectedBike && (
              <div className="sm:col-span-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
                Cuota inicial {formatCop(selectedBike.cuota_inicial)} · Cuota
                diaria base {formatCop(selectedBike.cuota_diaria)}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="placa">Placa (opcional)</Label>
              <Input
                id="placa"
                name="placa"
                defaultValue={compra?.placa ?? ""}
                placeholder="ABC123"
                className="uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chasis">Chasis</Label>
              <Input
                id="chasis"
                name="chasis"
                required
                defaultValue={compra?.chasis ?? ""}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="referencia">Referencia (opcional)</Label>
              <Input
                id="referencia"
                name="referencia"
                defaultValue={compra?.referencia ?? ""}
              />
            </div>
          </div>
          <Button
            type="submit"
            size="lg"
            className="mt-2 w-full bg-black text-white hover:bg-neutral-800 sm:w-auto"
            disabled={pending}
          >
            Guardar moto y generar contrato
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
