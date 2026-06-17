import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { contractStatusLabel } from "@/lib/pipeline/step-logic";
import { getContractPublicUrl } from "@/lib/utils/storage-urls";
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
      <Card className="border-neutral-200 shadow-none">
        <CardContent className="py-8 text-center text-sm text-neutral-500">
          El cliente aún no ha iniciado los formatos.
        </CardContent>
      </Card>
    );
  }

  const hoja = contract.hoja_vida_data as Record<string, unknown>;
  const hojaPdf = getContractPublicUrl(contract.hoja_vida_pdf_path);
  const contratoPdf = getContractPublicUrl(contract.contrato_pdf_path);

  return (
    <Card className="border-neutral-200 shadow-none">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-lg">Contrato digital</CardTitle>
          <p className="mt-1 text-sm text-neutral-500">Solo lectura</p>
        </div>
        <Badge variant="outline" className="w-fit border-neutral-300">
          {contractStatusLabel(contract.status)}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
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
        {Object.keys(hoja).length > 0 && (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <p className="mb-2 font-medium">Datos de hoja de vida</p>
            <dl className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["Celular", hoja.celular],
                  ["Dirección", hoja.direccion],
                  ["Barrio", hoja.barrio],
                  ["Ciudad", hoja.ciudad],
                ] as [string, unknown][]
              ).map(([key, val]) =>
                val ? (
                  <div key={key}>
                    <dt className="text-neutral-500">{key}</dt>
                    <dd>{String(val)}</dd>
                  </div>
                ) : null,
              )}
            </dl>
          </div>
        )}
        {contract.status !== "firmado" && (
          <p className="text-neutral-500">
            Esperando al cliente para completar y firmar.
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
      className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-3 hover:border-neutral-400"
    >
      <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
      {label}
    </Link>
  );
}
