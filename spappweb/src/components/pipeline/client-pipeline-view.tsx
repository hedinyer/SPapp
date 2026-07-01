import type { ClientPipeline, VisitadorRow } from "@/lib/pipeline/types";
import { ClientStepper } from "@/components/pipeline/client-stepper";
import { CreditReviewPanel } from "@/components/pipeline/credit-review-panel";
import { ContractReadonlyPanel } from "@/components/pipeline/contract-readonly-panel";
import { VisitActionPanel } from "@/components/pipeline/visit-action-panel";
import { MotoSelectionPanel } from "@/components/pipeline/moto-selection-panel";
import { PaymentConfirmPanel } from "@/components/pipeline/payment-confirm-panel";
import { DeliveryPanel } from "@/components/pipeline/delivery-panel";
import { RentingPanel } from "@/components/pipeline/renting-panel";
import { MoraSummaryBanner } from "@/components/pipeline/mora-summary-banner";
import { TrackingPanel } from "@/components/pipeline/tracking-panel";

interface ClientPipelineViewProps {
  pipeline: ClientPipeline;
  visitadores: VisitadorRow[];
}

export function ClientPipelineView({
  pipeline,
  visitadores,
}: ClientPipelineViewProps) {
  const { userId } = { userId: pipeline.user.id };
  const adminStep = pipeline.currentAdminStep;
  const contractId = pipeline.contract?.id ?? null;
  const contractSigned = pipeline.contract?.status === "firmado";
  const clienteCelular =
    typeof pipeline.contract?.hoja_vida_data?.celular === "string"
      ? (pipeline.contract.hoja_vida_data.celular as string)
      : null;
  const referenciasUsadas = pipeline.pagosHistorial
    .map((p) => p.referencia)
    .filter((r): r is string => Boolean(r?.trim()));

  return (
    <div className="space-y-8">
      <ClientStepper steps={pipeline.steps} />
      <MoraSummaryBanner pipeline={pipeline} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {adminStep === "credito" && pipeline.document && (
            <CreditReviewPanel
              document={pipeline.document}
              userId={userId}
              contractId={contractId}
              clienteCelular={clienteCelular}
              contractSigned={contractSigned}
            />
          )}
          {contractSigned && !pipeline.compra && (
            <MotoSelectionPanel
              contract={pipeline.contract}
              compra={pipeline.compra}
              contractId={contractId}
              clienteCelular={clienteCelular}
            />
          )}
          {adminStep === "pago" && (
            <PaymentConfirmPanel
              compra={pipeline.compra}
              pagos={pipeline.pagos}
              userId={userId}
              referenciasUsadas={referenciasUsadas}
            />
          )}
          {adminStep === "entrega" && (
            <DeliveryPanel compra={pipeline.compra} userId={userId} />
          )}
          {adminStep === "visita" && (
            <VisitActionPanel
              visita={pipeline.visita}
              visitadores={visitadores}
              userId={userId}
            />
          )}
          {pipeline.compra?.estado === "entregada" && (
            <RentingPanel pipeline={pipeline} userId={userId} />
          )}

          {!adminStep &&
            pipeline.compra?.estado !== "entregada" &&
            !(contractSigned && !pipeline.compra) && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-6 py-10 text-center text-sm text-neutral-600">
              No hay acciones pendientes de tu parte. El cliente continúa en
              la app.
            </div>
          )}

          <details className="rounded-lg border border-neutral-200">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
              Ver historial del proceso
            </summary>
            <div className="space-y-4 border-t border-neutral-200 p-4">
              {pipeline.document && adminStep !== "credito" && (
                <CreditReviewPanel
                  document={pipeline.document}
                  userId={userId}
                  contractId={contractId}
                  clienteCelular={clienteCelular}
                  contractSigned={contractSigned}
                />
              )}
              <ContractReadonlyPanel contract={pipeline.contract} />
              <MotoSelectionPanel
                contract={pipeline.contract}
                compra={pipeline.compra}
                contractId={contractId}
                clienteCelular={clienteCelular}
              />
              {adminStep !== "pago" && (
                <PaymentConfirmPanel
                  compra={pipeline.compra}
                  pagos={pipeline.pagos}
                  userId={userId}
                  referenciasUsadas={referenciasUsadas}
                />
              )}
              {adminStep !== "entrega" && (
                <DeliveryPanel compra={pipeline.compra} userId={userId} />
              )}
              {adminStep !== "visita" && (
                <VisitActionPanel
                  visita={pipeline.visita}
                  visitadores={visitadores}
                  userId={userId}
                />
              )}
            </div>
          </details>
        </div>

        <div className="space-y-6">
          <TrackingPanel
            tracking={pipeline.tracking}
            userId={userId}
            moroso={pipeline.moroso}
            recoger={pipeline.recoger}
            atraso={pipeline.atraso}
          />
        </div>
      </div>
    </div>
  );
}
