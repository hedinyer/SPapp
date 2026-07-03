"use client";

import { useTransition } from "react";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import {
  registrarCobroVisitaDesdeCaja,
  type CajaSesionState,
} from "@/lib/actions/caja-actions";
import type { CajaVisitasResumen } from "@/lib/caja/caja-informe";
import { formatCop, formatDate } from "@/lib/utils/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function CajaVisitasPanel({
  sesion,
  onUpdated,
}: {
  sesion: CajaSesionState;
  onUpdated: (next: CajaSesionState) => void;
}) {
  const [pending, startTransition] = useTransition();
  const { visitasResumen: visitas } = sesion;
  const { cobradas, pendientes, totalCobradoSesion, totalPendiente } = visitas;

  function registrarCobro(
    compraId: string,
    userId: number,
    clienteNombre: string,
  ) {
    startTransition(async () => {
      try {
        const next = await registrarCobroVisitaDesdeCaja({
          sesionId: sesion.id,
          compraId,
          userId,
          medioPagoAdmin: "efectivo",
        });
        if (!next) return;
        onUpdated(next);
        toast.success(`Visita de ${clienteNombre} registrada en caja.`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "No se pudo registrar el cobro.",
        );
      }
    });
  }

  return (
    <Card className="border-neutral-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-4 w-4 text-amber-600" />
          Visitas domiciliarias
        </CardTitle>
        <CardDescription>
          Solo ingresos de visita ya cobrados. Las visitas pendientes de cobro no
          aparecen aquí.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={totalPendiente > 0 ? "grid gap-3 sm:grid-cols-2" : ""}>
          <div className="rounded-lg border border-green-200 bg-green-50/60 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-green-800">
              Ingresó hoy
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-green-900">
              {formatCop(totalCobradoSesion)}
            </p>
            <p className="text-xs text-green-800/80">
              {cobradas.length} visita{cobradas.length === 1 ? "" : "s"} cobrada
              {cobradas.length === 1 ? "" : "s"}
            </p>
          </div>
          {totalPendiente > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-900">
              Falta registrar en caja
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-amber-950">
              {formatCop(totalPendiente)}
            </p>
            <p className="text-xs text-amber-900/80">
              Visita completada y cobrada · pulsa &ldquo;Registrar ingreso&rdquo;
            </p>
          </div>
          ) : null}
        </div>

        {cobradas.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-neutral-500">
              Ingresos de visita hoy
            </p>
            <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
              {cobradas.map((row) => (
                <li
                  key={row.pagoId}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.clienteNombre}</p>
                    <p className="text-xs text-neutral-500">
                      {row.medioLabel} · {formatDate(row.confirmadoAt)}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums text-green-700">
                    +{formatCop(row.monto)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-neutral-200 px-3 py-4 text-sm text-neutral-600">
            Aún no hay visitas registradas como ingreso hoy.
          </p>
        )}

        {pendientes.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-neutral-500">
              Visita completada · falta registrar en caja
            </p>
            <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
              {pendientes.map((row) => (
                <li
                  key={row.compraId}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.clienteNombre}</p>
                    <p className="text-xs text-neutral-500">
                      Visita {formatCop(row.montoEsperado)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-semibold tabular-nums text-amber-900">
                      {formatCop(row.faltante)}
                    </span>
                    {sesion.abierta ? (
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="h-7 bg-black px-2 text-xs text-white hover:bg-neutral-800"
                        disabled={pending}
                        onClick={() =>
                          registrarCobro(
                            row.compraId,
                            row.userId,
                            row.clienteNombre,
                          )
                        }
                      >
                        {pending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Registrar ingreso"
                        )}
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
