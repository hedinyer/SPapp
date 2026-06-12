"use client";

import { useMemo, useTransition } from "react";
import { toast } from "sonner";
import { confirmTarifaPago, resolveMoroso } from "@/lib/actions/admin-actions";
import {
  FRECUENCIA_LABELS,
  TARIFA_ESTADO_LABELS,
  type ClientPipeline,
  type TarifaPagadaRow,
} from "@/lib/pipeline/types";
import { formatCop, formatDateOnly } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RentingPanelProps {
  pipeline: ClientPipeline;
  userId: number;
}

function tarifaBadgeVariant(estado: TarifaPagadaRow["estado"]) {
  switch (estado) {
    case "pagada":
      return "default" as const;
    case "vencida":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

export function RentingPanel({ pipeline, userId }: RentingPanelProps) {
  const [pending, startTransition] = useTransition();
  const { compra, rentingResumen, tarifas, moroso, recoger } = pipeline;

  const visibleTarifas = useMemo(() => {
    const pending = tarifas.filter((t) => t.estado !== "pagada");
    const recentPaid = tarifas
      .filter((t) => t.estado === "pagada")
      .slice(-3);
    return [...pending.slice(0, 10), ...recentPaid].sort(
      (a, b) => a.numero_periodo - b.numero_periodo,
    );
  }, [tarifas]);

  if (!compra || compra.estado !== "entregada") {
    return null;
  }

  function confirmTarifa(tarifaId: string) {
    startTransition(async () => {
      try {
        await confirmTarifaPago({ tarifaId, userId });
        toast.success("Tarifa confirmada como pagada.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al confirmar.");
      }
    });
  }

  function regularizarMoroso() {
    if (!moroso) return;
    startTransition(async () => {
      try {
        await resolveMoroso({ morosoId: moroso.id, userId });
        toast.success("Cliente regularizado.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al regularizar.");
      }
    });
  }

  return (
    <Card className="border-neutral-200 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">Cartera de renting</CardTitle>
        <p className="text-sm text-neutral-500">
          {compra.modelo} · {compra.color}
          {compra.placa ? ` · Placa ${compra.placa}` : ""}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {rentingResumen && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total pagado" value={formatCop(rentingResumen.totalPagado)} />
            <Stat
              label="Adeudado"
              value={formatCop(rentingResumen.totalAdeudado)}
              highlight={rentingResumen.totalAdeudado > 0}
            />
            <Stat
              label="Cuotas pagadas"
              value={String(rentingResumen.cuotasPagadas)}
            />
            <Stat
              label="Cuotas pendientes"
              value={String(
                rentingResumen.cuotasPendientes + rentingResumen.cuotasVencidas,
              )}
            />
          </div>
        )}

        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-neutral-500">Frecuencia: </span>
            {FRECUENCIA_LABELS[compra.frecuencia_pago]}
          </p>
          <p>
            <span className="text-neutral-500">Cuota por periodo: </span>
            {formatCop(compra.monto_cuota_periodo)}
          </p>
          {rentingResumen?.proximoVencimiento && (
            <p>
              <span className="text-neutral-500">Próximo vencimiento: </span>
              {formatDateOnly(rentingResumen.proximoVencimiento)}
            </p>
          )}
          {rentingResumen?.diasAtraso != null && rentingResumen.diasAtraso > 0 && (
            <p className="font-medium text-red-700">
              Días de atraso: {rentingResumen.diasAtraso}
            </p>
          )}
        </div>

        {moroso && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="font-medium text-amber-900">Cliente en mora</p>
            <p className="mt-1 text-amber-800">
              {moroso.dias_atraso} días de atraso · Adeudado{" "}
              {formatCop(moroso.monto_adeudado)}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              disabled={pending}
              onClick={regularizarMoroso}
            >
              Marcar regularizado
            </Button>
          </div>
        )}

        {recoger && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm">
            <p className="font-medium text-red-900">Moto para recoger</p>
            <p className="mt-1 text-red-800">
              {recoger.dias_atraso} días de mora · Adeudado{" "}
              {formatCop(recoger.monto_adeudado)}
            </p>
          </div>
        )}

        {tarifas.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Aún no hay calendario de tarifas. Se genera al marcar la moto como
            entregada.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleTarifas.map((tarifa) => (
                  <TableRow key={tarifa.id}>
                    <TableCell>{tarifa.numero_periodo}</TableCell>
                    <TableCell>
                      {formatDateOnly(tarifa.fecha_vencimiento)}
                    </TableCell>
                    <TableCell>{formatCop(tarifa.monto_esperado)}</TableCell>
                    <TableCell>
                      <Badge variant={tarifaBadgeVariant(tarifa.estado)}>
                        {TARIFA_ESTADO_LABELS[tarifa.estado]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {tarifa.estado !== "pagada" ? (
                        <Button
                          size="sm"
                          disabled={pending}
                          onClick={() => confirmTarifa(tarifa.id)}
                        >
                          Confirmar pago
                        </Button>
                      ) : (
                        <span className="text-xs text-neutral-500">
                          {tarifa.pagada_at
                            ? formatDateOnly(tarifa.pagada_at)
                            : "—"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold ${highlight ? "text-red-700" : "text-black"}`}
      >
        {value}
      </p>
    </div>
  );
}
