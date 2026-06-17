import type { ClientPipeline } from "@/lib/pipeline/types";
import {
  COMPRA_ESTADO_LABELS,
  FRECUENCIA_LABELS,
} from "@/lib/pipeline/types";
import { formatCop, formatCuotas } from "@/lib/utils/format";
import { Card, CardContent } from "@/components/ui/card";

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}

export function ClientInfoSummary({ pipeline }: { pipeline: ClientPipeline }) {
  const hoja = pipeline.contract?.hoja_vida_data as
    | Record<string, unknown>
    | undefined;
  const contrato = pipeline.contract?.contrato_data as
    | Record<string, unknown>
    | undefined;
  const cedula =
    (hoja?.numero_identificacion as string | undefined)?.trim() ||
    (contrato?.cedula_contratante as string | undefined)?.trim() ||
    null;
  const celular =
    (hoja?.celular as string | undefined)?.trim() ||
    pipeline.visita?.cliente_celular?.trim() ||
    null;
  const compra = pipeline.compra;
  const resumen = pipeline.rentingResumen;

  const hasContent =
    cedula ||
    celular ||
    compra ||
    resumen ||
    pipeline.visita?.direccion_visita;

  if (!hasContent) return null;

  return (
    <Card className="border-neutral-200 shadow-none">
      <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
        {cedula && <InfoItem label="Cédula" value={cedula} />}
        {celular && <InfoItem label="Celular" value={celular} />}
        {compra && (
          <>
            <InfoItem
              label="Moto"
              value={`${compra.modelo} · ${compra.color}`}
            />
            {compra.placa && <InfoItem label="Placa" value={compra.placa} />}
            <InfoItem
              label="Estado compra"
              value={COMPRA_ESTADO_LABELS[compra.estado]}
            />
            {compra.estado === "entregada" && (
              <InfoItem
                label="Frecuencia de pago"
                value={FRECUENCIA_LABELS[compra.frecuencia_pago]}
              />
            )}
          </>
        )}
        {pipeline.visita?.direccion_visita && (
          <InfoItem
            label="Dirección"
            value={pipeline.visita.direccion_visita}
          />
        )}
        {resumen && (
          <>
            <InfoItem
              label="Cuotas pagadas"
              value={formatCuotas(resumen.cuotasPagadas)}
            />
            <InfoItem
              label="Total pagado"
              value={formatCop(resumen.totalPagado)}
            />
            {resumen.totalAdeudado > 0 && (
              <InfoItem
                label="Adeudado"
                value={formatCop(resumen.totalAdeudado)}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
