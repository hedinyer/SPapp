"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  assignVisit,
  cancelVisit,
  completeVisit,
} from "@/lib/actions/admin-actions";
import type { VisitaRow, VisitadorRow } from "@/lib/pipeline/types";
import { formatDate } from "@/lib/utils/format";
import { visitaEstadoLabel } from "@/lib/pipeline/step-logic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface VisitActionPanelProps {
  visita: VisitaRow | null;
  visitadores: VisitadorRow[];
  userId: number;
}

export function VisitActionPanel({
  visita,
  visitadores,
  userId,
}: VisitActionPanelProps) {
  const [pending, startTransition] = useTransition();

  if (!visita) {
    return (
      <Card className="border-neutral-200 shadow-none">
        <CardContent className="py-8 text-center text-sm text-neutral-500">
          La visita se creará cuando el cliente firme el contrato.
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
        <CardTitle className="text-lg">Visita domiciliaria</CardTitle>
        <p className="text-sm text-neutral-500">
          Estado: {visitaEstadoLabel(visita.estado)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-500">Cliente</dt>
            <dd>{visita.cliente_nombre ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Celular</dt>
            <dd>{visita.cliente_celular ?? "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-neutral-500">Dirección</dt>
            <dd>
              {[visita.direccion_visita, visita.barrio]
                .filter(Boolean)
                .join(", ") || "—"}
            </dd>
          </div>
        </dl>

        {visita.estado === "pendiente_asignacion" && (
          <AssignForm
            visitadores={visitadores}
            pending={pending}
            visita={visita}
            onAssign={(visitadorId, fecha) =>
              run(
                () =>
                  assignVisit({
                    visitaId: visita.id,
                    userId,
                    visitadorId,
                    fechaProgramada: fecha,
                  }),
                "Visita asignada.",
              )
            }
          />
        )}

        {visita.estado === "asignada" && (
          <div className="space-y-4 rounded-lg border border-neutral-200 p-4">
            <p className="text-sm">
              <span className="text-neutral-500">Visitador: </span>
              {visita.visitadores?.nombre ?? "—"}
            </p>
            <p className="text-sm">
              <span className="text-neutral-500">Fecha: </span>
              {formatDate(visita.fecha_programada)}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                className="bg-black text-white hover:bg-neutral-800"
                disabled={pending}
                onClick={() =>
                  run(
                    () => completeVisit(visita.id, userId),
                    "Visita marcada como completada.",
                  )
                }
              >
                Marcar completada
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="lg" variant="outline" disabled={pending}>
                    Cancelar visita
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Cancelar visita?</AlertDialogTitle>
                    <AlertDialogDescription>
                      El cliente verá que debe contactar al concesionario.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Volver</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        run(
                          () => cancelVisit(visita.id, userId),
                          "Visita cancelada.",
                        )
                      }
                    >
                      Sí, cancelar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}

        {(visita.estado === "completada" || visita.estado === "cancelada") && (
          <p className="text-sm text-neutral-600">
            {visita.estado === "completada"
              ? "Visita completada. El cliente puede elegir su moto."
              : "Visita cancelada."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AssignForm({
  visita,
  visitadores,
  pending,
  onAssign,
}: {
  visita: VisitaRow;
  visitadores: VisitadorRow[];
  pending: boolean;
  onAssign: (visitadorId: number, fecha: string) => void;
}) {
  const [visitadorId, setVisitadorId] = useState<string>("");

  return (
    <form
      className="space-y-4 rounded-lg border border-neutral-200 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const fecha = String(fd.get("fecha"));
        const id = Number(visitadorId);
        if (!id || !fecha) {
          toast.error("Selecciona visitador y fecha.");
          return;
        }
        onAssign(id, new Date(fecha).toISOString());
      }}
    >
      <p className="text-sm font-medium">Asignar visitador</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Visitador</Label>
          <Select value={visitadorId} onValueChange={setVisitadorId} required>
            <SelectTrigger>
              <SelectValue placeholder="Elegir visitador" />
            </SelectTrigger>
            <SelectContent>
              {visitadores.map((v) => (
                <SelectItem key={v.id} value={String(v.id)}>
                  {v.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fecha">Fecha y hora</Label>
          <Input
            id="fecha"
            name="fecha"
            type="datetime-local"
            required
            defaultValue={
              visita.fecha_programada
                ? visita.fecha_programada.slice(0, 16)
                : undefined
            }
          />
        </div>
      </div>
      <Button
        type="submit"
        size="lg"
        className="bg-black text-white hover:bg-neutral-800"
        disabled={pending || visitadores.length === 0}
      >
        Asignar visita
      </Button>
      {visitadores.length === 0 && (
        <p className="text-sm text-neutral-500">
          Crea visitadores en el menú lateral primero.
        </p>
      )}
    </form>
  );
}
