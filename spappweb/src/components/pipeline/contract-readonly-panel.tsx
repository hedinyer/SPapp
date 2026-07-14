import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { contractStatusLabel } from "@/lib/pipeline/step-logic";
import { getContractPublicUrl } from "@/lib/utils/storage-urls";
import {
  ESTADO_CIVIL_LABELS,
  TIPO_IDENTIFICACION_LABELS,
  type EstadoCivil,
  type TipoIdentificacion,
} from "@/lib/contracts/hoja-vida-schema";
import type { DigitalContractRow } from "@/lib/pipeline/types";
import { formatDate } from "@/lib/utils/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ContractReadonlyPanelProps {
  contract: DigitalContractRow | null;
}

export function ContractReadonlyPanel({ contract }: ContractReadonlyPanelProps) {
  if (!contract) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          El contrato se generará cuando asignes moto y placa.
        </CardContent>
      </Card>
    );
  }

  const hoja = contract.hoja_vida_data as Record<string, unknown>;
  const hojaPdf = getContractPublicUrl(contract.hoja_vida_pdf_path);
  const contratoPdf = getContractPublicUrl(contract.contrato_pdf_path);
  const hasHojaData = Object.keys(hoja).length > 0;
  const referencias = Array.isArray(hoja.referencias)
    ? (hoja.referencias as { nombre?: string; celular?: string }[])
    : [];

  const tipo = hoja.tipo_identificacion as TipoIdentificacion | undefined;
  const tipoLabel =
    tipo && tipo in TIPO_IDENTIFICACION_LABELS
      ? TIPO_IDENTIFICACION_LABELS[tipo]
      : null;
  const estado = hoja.estado_civil as EstadoCivil | undefined;
  const estadoLabel =
    estado && estado in ESTADO_CIVIL_LABELS
      ? ESTADO_CIVIL_LABELS[estado]
      : null;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <CardTitle>Contrato digital</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Solo lectura</p>
        </div>
        <Badge variant="outline" className="w-fit border-border">
          {contractStatusLabel(contract.status)}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        {contract.signed_at && (
          <p>Firmado: {formatDate(contract.signed_at)}</p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {hojaPdf && (
            <PdfLink href={hojaPdf} label="PDF Hoja de vida" />
          )}
          {contratoPdf && (
            <PdfLink href={contratoPdf} label="PDF Contrato" />
          )}
        </div>
        {hasHojaData && (
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="mb-2 font-medium">Datos de hoja de vida</p>
            <dl className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["Nombre", hoja.nombre_completo],
                  [
                    "Identificación",
                    tipoLabel && hoja.numero_identificacion
                      ? `${tipoLabel} ${hoja.numero_identificacion}`
                      : hoja.numero_identificacion,
                  ],
                  ["Fecha nacimiento", hoja.fecha_nacimiento],
                  ["Celular", hoja.celular],
                  ["Correo", hoja.correo],
                  ["Dirección", hoja.direccion],
                  ["Barrio", hoja.barrio],
                  ["Estado civil", estadoLabel],
                  ["Empresa", hoja.nombre_empresa],
                  ["Oficio", hoja.habilidad],
                  ["Cónyuge", hoja.nombre_conyuge],
                  ["Celular cónyuge", hoja.celular_conyuge],
                ] as [string, unknown][]
              ).map(([key, val]) =>
                val ? (
                  <div key={key}>
                    <dt className="text-muted-foreground">{key}</dt>
                    <dd>{String(val)}</dd>
                  </div>
                ) : null,
              )}
            </dl>
            {referencias.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                <p className="font-medium">Referencias</p>
                {referencias.map((r, i) =>
                  r.nombre || r.celular ? (
                    <p key={i} className="text-foreground">
                      {i + 1}. {r.nombre ?? "—"} · {r.celular ?? "—"}
                    </p>
                  ) : null,
                )}
              </div>
            )}
          </div>
        )}
        {contract.status !== "firmado" && !hasHojaData && (
          <p className="text-muted-foreground">
            Esperando al cliente para completar la hoja de vida.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PdfLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-3 hover:border-foreground/30"
    >
      <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
      {label}
    </Link>
  );
}
