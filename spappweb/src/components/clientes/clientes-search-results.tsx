import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  COMPRA_ESTADO_LABELS,
  type ClientSearchResult,
} from "@/lib/pipeline/types";
import { Badge } from "@/components/ui/badge";

export function ClientesSearchResults({
  results,
  query,
}: {
  results: ClientSearchResult[];
  query: string;
}) {
  if (results.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No se encontraron clientes para &ldquo;{query}&rdquo;. Prueba con placa,
        cédula o nombre completo.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-500">
        {results.length} resultado{results.length === 1 ? "" : "s"}
      </p>
      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
        {results.map((client) => (
          <li key={client.userId}>
            <Link
              href={`/clientes/${client.userId}`}
              className="flex flex-col gap-3 px-4 py-4 hover:bg-neutral-50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{client.displayName}</p>
                  <Badge variant="secondary" className="text-xs">
                    {client.matchLabel}
                  </Badge>
                  {client.compraEstado && (
                    <Badge variant="outline" className="text-xs">
                      {COMPRA_ESTADO_LABELS[client.compraEstado]}
                    </Badge>
                  )}
                </div>
                <p className="truncate text-sm text-neutral-500">
                  @{client.username}
                  {client.cedula ? ` · C.C. ${client.cedula}` : ""}
                  {client.placa ? ` · Placa ${client.placa}` : ""}
                  {client.motoLabel ? ` · ${client.motoLabel}` : ""}
                </p>
                {client.cuotasPagadas > 0 && (
                  <p className="text-sm text-neutral-600">
                    {client.cuotasPagadas} cuota
                    {client.cuotasPagadas === 1 ? "" : "s"} pagada
                    {client.cuotasPagadas === 1 ? "" : "s"}
                  </p>
                )}
              </div>
              <ArrowRight className="hidden h-4 w-4 shrink-0 text-neutral-400 sm:block" />
              <span className="text-sm font-medium text-black sm:hidden">
                Ver ficha →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
