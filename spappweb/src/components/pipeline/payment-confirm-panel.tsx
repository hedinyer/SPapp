"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { removePagoAbono } from "@/lib/actions/payment-comprobante-actions";
import {
  abonosPorConcepto,
  conceptoCompleto,
  faltanteConcepto,
  montoEsperadoConcepto,
  sumAbonos,
  type PrimerPagoConcepto,
} from "@/lib/payments/primer-pago-progress";
import type { ContextoPago, PagoRow, UserMotoCompraRow } from "@/lib/pipeline/types";
import {
  CONTEXTO_PAGO_LABELS,
  MEDIO_PAGO_ADMIN_LABELS,
} from "@/lib/pipeline/types";
import { formatCop, formatDate } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentComprobanteDialog } from "@/components/pipeline/payment-comprobante-dialog";

interface PaymentConfirmPanelProps {
  compra: UserMotoCompraRow | null;
  pagos: PagoRow[];
  userId: number;
  referenciasUsadas?: string[];
}

export function PaymentConfirmPanel({
  compra,
  pagos,
  userId,
  referenciasUsadas = [],
}: PaymentConfirmPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogContexto, setDialogContexto] =
    useState<PrimerPagoConcepto>("inicial");

  if (!compra) {
    return (
      <Card className="border-neutral-200 shadow-none">
        <CardContent className="py-8 text-center text-sm text-neutral-500">
          Aún no hay selección de moto.
        </CardContent>
      </Card>
    );
  }

  if (compra.estado !== "pendiente_pago" && compra.estado !== "lista_retiro") {
    return (
      <Card className="border-neutral-200 shadow-none">
        <CardContent className="py-8 text-center text-sm text-neutral-600">
          Pagos confirmados. Estado: {compra.estado.replace("_", " ")}.
        </CardContent>
      </Card>
    );
  }

  const canEditAbonos = compra.estado === "pendiente_pago";

  function openAbonoDialog(contexto: PrimerPagoConcepto) {
    setDialogContexto(contexto);
    setDialogOpen(true);
  }

  return (
    <>
      <Card className="border-neutral-200 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg">Confirmar pagos</CardTitle>
          <p className="text-sm text-neutral-500">
            Registra uno o varios abonos por concepto (Nequi Nicolás o
            Davivienda).
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-sm text-neutral-500">Total esperado</p>
            <p className="text-2xl font-semibold">
              {formatCop(compra.monto_total_primer_pago)}
            </p>
            <p className="mt-2 text-sm text-neutral-600">
              Inicial {formatCop(compra.cuota_inicial_monto)} + adelantada{" "}
              {formatCop(compra.monto_cuota_periodo)}
            </p>
          </div>

          <ConceptoAbonoSection
            compra={compra}
            pagos={pagos}
            contexto="inicial"
            userId={userId}
            canEdit={canEditAbonos}
            onAddAbono={() => openAbonoDialog("inicial")}
          />
          <ConceptoAbonoSection
            compra={compra}
            pagos={pagos}
            contexto="cuota_adelantada"
            userId={userId}
            canEdit={canEditAbonos}
            onAddAbono={() => openAbonoDialog("cuota_adelantada")}
          />
        </CardContent>
      </Card>

      <PaymentComprobanteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contexto={dialogContexto as ContextoPago}
        userId={userId}
        compraId={compra.id}
        montoEsperado={montoEsperadoConcepto(compra, dialogContexto)}
        montoFaltante={faltanteConcepto(compra, pagos, dialogContexto)}
        referenciasUsadas={referenciasUsadas}
      />
    </>
  );
}

function ConceptoAbonoSection({
  compra,
  pagos,
  contexto,
  userId,
  canEdit,
  onAddAbono,
}: {
  compra: UserMotoCompraRow;
  pagos: PagoRow[];
  contexto: PrimerPagoConcepto;
  userId: number;
  canEdit: boolean;
  onAddAbono: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const esperado = montoEsperadoConcepto(compra, contexto);
  const recibido = sumAbonos(pagos, contexto);
  const faltante = faltanteConcepto(compra, pagos, contexto);
  const completo = conceptoCompleto(compra, pagos, contexto);
  const abonos = abonosPorConcepto(pagos, contexto);
  const pct = esperado > 0 ? Math.min(100, (recibido / esperado) * 100) : 0;

  function handleRemove(pagoId: string) {
    startTransition(async () => {
      try {
        await removePagoAbono(pagoId, userId);
        toast.success("Abono eliminado.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al eliminar.");
      }
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <p className="font-medium">{CONTEXTO_PAGO_LABELS[contexto]}</p>
          <p className="text-sm text-neutral-500">
            {formatCop(recibido)} de {formatCop(esperado)}
            {!completo && faltante > 0 && ` · faltan ${formatCop(faltante)}`}
          </p>
        </div>
        {completo ? (
          <span className="w-fit rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            Confirmado
          </span>
        ) : (
          <span className="w-fit rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
            Pendiente
          </span>
        )}
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full bg-black transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {abonos.length > 0 && (
        <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-100">
          {abonos.map((abono) => (
            <li
              key={abono.id}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{formatCop(abono.monto)}</p>
                <p className="truncate text-neutral-500">
                  {abono.medio_pago_admin
                    ? MEDIO_PAGO_ADMIN_LABELS[abono.medio_pago_admin]
                    : "—"}
                  {abono.referencia ? ` · Ref. ${abono.referencia}` : ""}
                  {abono.confirmado_at
                    ? ` · ${formatDate(abono.confirmado_at)}`
                    : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {abono.comprobante_url && (
                  <a
                    href={abono.comprobante_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded p-1.5 text-neutral-500 hover:bg-neutral-100"
                    title="Ver comprobante"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                {canEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={pending}
                    onClick={() => handleRemove(abono.id)}
                    title="Eliminar abono"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canEdit && !completo && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddAbono}
        >
          Agregar abono
        </Button>
      )}
    </div>
  );
}
