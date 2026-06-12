"use client";

import { useTransition } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import { toast } from "sonner";
import { setTracking } from "@/lib/actions/admin-actions";
import type { MorosoRow, MotoParaRecogerRow, UserTrackingRow } from "@/lib/pipeline/types";
import { formatDate } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TrackingPanelProps {
  tracking: UserTrackingRow | null;
  userId: number;
  moroso?: MorosoRow | null;
  recoger?: MotoParaRecogerRow | null;
}

export function TrackingPanel({
  tracking,
  userId,
  moroso,
  recoger,
}: TrackingPanelProps) {
  const [pending, startTransition] = useTransition();

  if (!tracking) {
    return null;
  }

  const needsTracking =
    (moroso?.dias_atraso ?? 0) >= 3 || recoger != null;
  const location = tracking.ubicacion_1;
  const hasLocation =
    location?.lat != null && location?.lng != null;
  const mapsUrl = hasLocation
    ? `https://www.google.com/maps?q=${location.lat},${location.lng}`
    : null;

  return (
    <Card
      className={`border-neutral-200 shadow-none ${needsTracking && !tracking.seguimiento ? "border-amber-300 bg-amber-50/40" : ""}`}
    >
      <CardHeader>
        <CardTitle className="text-base">Seguimiento GPS</CardTitle>
        {needsTracking && !tracking.seguimiento && (
          <p className="text-sm font-medium text-amber-800">
            Recomendado: activar GPS por mora o recogida pendiente.
          </p>
        )}
        {recoger && (
          <p className="text-sm text-red-700">
            Moto marcada para recoger ({recoger.dias_atraso} días de mora).
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="seguimiento" className="font-normal">
            Seguimiento activo en la app
          </Label>
          <Switch
            id="seguimiento"
            checked={tracking.seguimiento}
            disabled={pending}
            onCheckedChange={(v) => {
              startTransition(async () => {
                try {
                  await setTracking(userId, v);
                  toast.success(
                    v ? "Seguimiento activado." : "Seguimiento desactivado.",
                  );
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Error al actualizar.",
                  );
                }
              });
            }}
          />
        </div>

        {needsTracking && !tracking.seguimiento && (
          <Button
            size="sm"
            className="w-full"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                try {
                  await setTracking(userId, true);
                  toast.success("Seguimiento activado.");
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Error al activar GPS.",
                  );
                }
              });
            }}
          >
            Activar GPS ahora
          </Button>
        )}

        {hasLocation ? (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-black">Última ubicación</p>
                <p className="mt-1 text-neutral-600">
                  {location.lat!.toFixed(5)}, {location.lng!.toFixed(5)}
                </p>
                {location.captured_at && (
                  <p className="mt-1 text-xs text-neutral-500">
                    {formatDate(location.captured_at)}
                  </p>
                )}
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-black underline-offset-2 hover:underline"
                  >
                    Ver en Google Maps
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">
            Sin ubicación registrada aún. Activa el seguimiento y espera la
            próxima captura desde la app.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
