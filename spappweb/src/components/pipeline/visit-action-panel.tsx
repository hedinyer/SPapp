"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ExternalLink, MapPin } from "lucide-react";
import { assignVisit, cancelVisit } from "@/lib/actions/admin-actions";
import type { VisitaRow, VisitadorRow } from "@/lib/pipeline/types";
import { formatDate } from "@/lib/utils/format";
import { visitaEstadoLabel } from "@/lib/pipeline/step-logic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TouchSelect } from "@/components/ui/touch-select";
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
import {
  ShareVisitadorLink,
  visitadorUsername,
} from "@/components/visitadores/share-visitador-link";

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
          La visita se creará cuando el pago esté confirmado y la moto quede
          lista para retiro.
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

  const fotos = visita.evidencia_fotos ?? [];
  const videos = visita.evidencia_videos ?? [];
  const ubicacion = visita.ubicacion_verificada;
  const assignedVisitador =
    visita.estado === "asignada"
      ? visitadores.find((v) => v.id === visita.visitador_id) ??
        visita.visitadores
      : null;
  const assignedUsername = visitadorUsername(assignedVisitador);

  return (
    <Card className="border-neutral-200 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">
          {visita.estado === "pendiente_asignacion"
            ? "Agendar visita domiciliaria"
            : "Visita domiciliaria"}
        </CardTitle>
        <p className="text-sm text-neutral-500">
          {visita.estado === "pendiente_asignacion"
            ? "Asigna visitador y fecha antes de entregar la moto al cliente."
            : `Estado: ${visitaEstadoLabel(visita.estado)}`}
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
            highlight
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
            {assignedVisitador && assignedUsername ? (
              <ShareVisitadorLink
                nombre={assignedVisitador.nombre}
                username={assignedUsername}
                telefono={assignedVisitador.telefono}
              />
            ) : (
              <p className="text-sm text-neutral-600">
                El visitador debe completar la visita desde la app o el portal
                visitador, subiendo fotos, video y ubicación.
              </p>
            )}
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
        )}

        {visita.estado === "completada" && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Visita completada
              {visita.fecha_completada
                ? ` el ${formatDate(visita.fecha_completada)}`
                : ""}
              . El proceso de visita domiciliaria quedó registrado.
            </p>

            {visita.notas_visita && (
              <div className="rounded-lg border border-neutral-200 p-3 text-sm">
                <p className="font-medium text-neutral-700">Notas del visitador</p>
                <p className="mt-1 text-neutral-600">{visita.notas_visita}</p>
              </div>
            )}

            {fotos.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Fotos de evidencia</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {fotos.map((foto, i) => (
                    <a
                      key={`${foto.url}-${i}`}
                      href={foto.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-lg border border-neutral-200"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={foto.url}
                        alt={`Evidencia ${i + 1}`}
                        className="aspect-square w-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {videos.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Videos de evidencia</p>
                <div className="space-y-3">
                  {videos.map((video, i) => (
                    <video
                      key={`${video.url}-${i}`}
                      src={video.url}
                      controls
                      className="w-full max-w-md rounded-lg border border-neutral-200"
                    />
                  ))}
                </div>
              </div>
            )}

            {ubicacion?.lat != null && ubicacion?.lng != null && (
              <div className="rounded-lg border border-neutral-200 p-3 text-sm">
                <p className="flex items-center gap-2 font-medium text-neutral-700">
                  <MapPin className="h-4 w-4" />
                  Ubicación verificada
                </p>
                <p className="mt-1 text-neutral-600">
                  {ubicacion.lat.toFixed(6)}, {ubicacion.lng.toFixed(6)}
                  {ubicacion.accuracy != null &&
                    ` · ±${Math.round(ubicacion.accuracy)} m`}
                </p>
                <a
                  href={`https://www.google.com/maps?q=${ubicacion.lat},${ubicacion.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  Ver en Google Maps
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        )}

        {visita.estado === "cancelada" && (
          <p className="text-sm text-neutral-600">Visita cancelada.</p>
        )}
      </CardContent>
    </Card>
  );
}

function AssignForm({
  visita,
  visitadores,
  pending,
  highlight = false,
  onAssign,
}: {
  visita: VisitaRow;
  visitadores: VisitadorRow[];
  pending: boolean;
  highlight?: boolean;
  onAssign: (visitadorId: number, fecha: string) => void;
}) {
  const [visitadorId, setVisitadorId] = useState("");
  const [fecha, setFecha] = useState(
    () => visita.fecha_programada?.slice(0, 16) ?? "",
  );

  return (
    <form
      className={`space-y-4 rounded-lg border p-4 ${
        highlight
          ? "border-black bg-neutral-50"
          : "border-neutral-200"
      }`}
      onSubmit={(e) => {
        e.preventDefault();
        const id = Number(visitadorId);
        if (!id || !fecha.trim()) {
          toast.error("Selecciona visitador y fecha.");
          return;
        }
        const parsed = new Date(fecha);
        if (Number.isNaN(parsed.getTime())) {
          toast.error("Fecha inválida.");
          return;
        }
        onAssign(id, parsed.toISOString());
      }}
    >
      <p className="text-sm font-medium">
        {highlight ? "Programar visita domiciliaria" : "Asignar visitador"}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Visitador</Label>
          <TouchSelect
            aria-label="Visitador"
            value={visitadorId}
            required
            placeholder="Selecciona visitador"
            onChange={setVisitadorId}
            options={visitadores.map((v) => ({
              value: String(v.id),
              label: v.nombre,
            }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fecha">Fecha y hora</Label>
          <Input
            id="fecha"
            name="fecha"
            type="datetime-local"
            className="min-h-11 touch-manipulation text-base md:text-sm"
            required
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
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
          Crea visitadores con cuenta de acceso en el menú lateral primero.
        </p>
      )}
    </form>
  );
}
