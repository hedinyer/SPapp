import type {
  ContractStatus,
  DigitalContractRow,
  UserMotoCompraRow,
} from "@/lib/pipeline/types";
import { FRECUENCIA_LABELS, COMPRA_ESTADO_LABELS } from "@/lib/pipeline/types";
import { formatCop } from "@/lib/utils/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MotoSelectionPanelProps {
  contract: DigitalContractRow | null;
  compra: UserMotoCompraRow | null;
}

function contractSigned(contract: DigitalContractRow | null): boolean {
  return (contract?.status as ContractStatus | undefined) === "firmado";
}

export function MotoSelectionPanel({
  contract,
  compra,
}: MotoSelectionPanelProps) {
  if (!contractSigned(contract)) {
    return (
      <Card className="border-neutral-200 shadow-none">
        <CardContent className="py-8 text-center text-sm text-neutral-500">
          El cliente aún no puede elegir moto (contrato no firmado).
        </CardContent>
      </Card>
    );
  }

  if (!compra) {
    return (
      <Card className="border-neutral-200 shadow-none">
        <CardContent className="py-8 text-center text-sm text-neutral-500">
          Esperando que el cliente elija su moto en la app.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-neutral-200 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">Moto seleccionada</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-500">Modelo</dt>
            <dd className="font-medium">{compra.modelo}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Color</dt>
            <dd className="font-medium">{compra.color}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Frecuencia</dt>
            <dd>{FRECUENCIA_LABELS[compra.frecuencia_pago]}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Estado</dt>
            <dd>{COMPRA_ESTADO_LABELS[compra.estado]}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Cuota inicial</dt>
            <dd>{formatCop(compra.cuota_inicial_monto)}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Cuota adelantada</dt>
            <dd>{formatCop(compra.monto_cuota_periodo)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-neutral-500">Total primer pago</dt>
            <dd className="text-lg font-semibold">
              {formatCop(compra.monto_total_primer_pago)}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
