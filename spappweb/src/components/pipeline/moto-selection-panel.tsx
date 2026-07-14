"use client";

import { Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import type {
  ContractStatus,
  DigitalContractRow,
  UserMotoCompraRow,
} from "@/lib/pipeline/types";
import { FRECUENCIA_LABELS, COMPRA_ESTADO_LABELS } from "@/lib/pipeline/types";
import { formatCop } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSiteUrl } from "@/lib/utils/site-url";

interface MotoSelectionPanelProps {
  contract: DigitalContractRow | null;
  compra: UserMotoCompraRow | null;
  contractId?: string | null;
  clienteCelular?: string | null;
}

function contractSigned(contract: DigitalContractRow | null): boolean {
  return (contract?.status as ContractStatus | undefined) === "firmado";
}

export function MotoSelectionPanel({
  contract,
  compra,
  contractId,
  clienteCelular,
}: MotoSelectionPanelProps) {
  if (!contractSigned(contract)) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {contract?.status === "firmado"
            ? "El cliente elige la moto desde el enlace (flujo anterior)."
            : "Asigna moto y placa desde el panel de administración."}
        </CardContent>
      </Card>
    );
  }

  if (!compra) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Selección de moto</CardTitle>
        </CardHeader>
        <CardContent>
          {contractId ? (
            <ShareMotoLinkCard
              contractId={contractId}
              celular={clienteCelular}
            />
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Esperando que el cliente elija su moto.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Moto seleccionada</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Modelo</dt>
            <dd className="font-medium">{compra.modelo}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Color</dt>
            <dd className="font-medium">{compra.color}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Frecuencia</dt>
            <dd>{FRECUENCIA_LABELS[compra.frecuencia_pago]}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Estado</dt>
            <dd>{COMPRA_ESTADO_LABELS[compra.estado]}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Cuota inicial</dt>
            <dd>{formatCop(compra.cuota_inicial_monto)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Cuota adelantada</dt>
            <dd>{formatCop(compra.monto_cuota_periodo)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Total primer pago</dt>
            <dd className="text-lg font-semibold">
              {formatCop(compra.monto_total_primer_pago)}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function ShareMotoLinkCard({
  contractId,
  celular,
}: {
  contractId: string;
  celular?: string | null;
}) {
  const link = `${getSiteUrl()}/moto/${contractId}`;

  function copy() {
    navigator.clipboard
      .writeText(link)
      .then(() => toast.success("Link copiado."))
      .catch(() => toast.error("No se pudo copiar."));
  }

  const mensaje = `Hola, ya puedes elegir tu moto aquí: ${link}`;
  const digits = (celular ?? "").replace(/\D/g, "");
  const waBase = digits ? `https://wa.me/57${digits}` : "https://wa.me/";
  const waUrl = `${waBase}?text=${encodeURIComponent(mensaje)}`;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-blue-300 bg-blue-50 p-4">
      <p className="text-sm font-medium text-blue-900">
        Link para que el cliente elija moto, modelo y color
      </p>
      <p className="break-all rounded-md border border-blue-200 bg-background px-3 py-2 text-xs text-foreground">
        {link}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={copy}>
          <Copy className="mr-1.5 h-4 w-4" />
          Copiar link
        </Button>
        <Button
          size="sm"
          className="bg-green-600 text-white hover:bg-green-700"
          asChild
        >
          <a href={waUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="mr-1.5 h-4 w-4" />
            Enviar por WhatsApp
          </a>
        </Button>
      </div>
    </div>
  );
}
