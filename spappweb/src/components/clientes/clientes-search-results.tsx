"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ArrowRight, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { deleteClienteSinVisita } from "@/lib/actions/admin-actions";
import {
  COMPRA_ESTADO_LABELS,
  type ClientSearchResult,
} from "@/lib/pipeline/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GenerarFacturasDialog } from "@/components/clientes/generar-facturas-dialog";

export function ClientesSearchResults({
  results,
  query,
}: {
  results: ClientSearchResult[];
  query: string;
}) {
  const router = useRouter();
  const [list, setList] = useState(results);
  const [pending, startTransition] = useTransition();
  const [toDelete, setToDelete] = useState<ClientSearchResult | null>(null);
  const [facturasUser, setFacturasUser] = useState<{
    userId: number;
    displayName: string;
  } | null>(null);

  useEffect(() => {
    setList(results);
  }, [results]);

  function confirmDelete() {
    if (!toDelete) return;
    const { userId, displayName } = toDelete;

    startTransition(async () => {
      try {
        await deleteClienteSinVisita(userId);
        setList((prev) => prev.filter((client) => client.userId !== userId));
        toast.success(`${displayName} eliminado.`);
        setToDelete(null);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo eliminar.");
      }
    });
  }

  if (results.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No se encontraron clientes para &ldquo;{query}&rdquo;. Prueba con placa,
        cédula o nombre completo.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <p className="text-sm text-neutral-500">
          {list.length} resultado{list.length === 1 ? "" : "s"}
        </p>
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
          {list.map((client) => (
            <li key={client.userId} className="flex items-stretch">
              <div className="flex min-w-0 flex-1 flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  href={`/clientes/${client.userId}`}
                  className="min-w-0 flex-1 hover:opacity-90"
                >
                  <div className="space-y-1">
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
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFacturasUser({
                        userId: client.userId,
                        displayName: client.displayName,
                      })
                    }
                  >
                    <FileText className="mr-1.5 h-4 w-4" />
                    Generar facturas
                  </Button>
                  <Link
                    href={`/clientes/${client.userId}`}
                    className="hidden items-center text-neutral-400 hover:text-neutral-600 sm:inline-flex"
                    aria-label="Ver ficha"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/clientes/${client.userId}`}
                    className="text-sm font-medium text-black sm:hidden"
                  >
                    Ver ficha →
                  </Link>
                </div>
              </div>
              <div className="flex shrink-0 items-center pr-2 sm:pr-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-neutral-400 hover:text-red-600"
                  aria-label={`Eliminar ${client.displayName}`}
                  disabled={pending}
                  onClick={() => setToDelete(client)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {facturasUser && (
        <GenerarFacturasDialog
          userId={facturasUser.userId}
          displayName={facturasUser.displayName}
          open={!!facturasUser}
          onOpenChange={(open) => {
            if (!open) setFacturasUser(null);
          }}
        />
      )}

      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setToDelete(null);
        }}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.displayName}
              {toDelete?.cedula
                ? ` (C.C. ${toDelete.cedula})`
                : toDelete
                  ? ` (@${toDelete.username})`
                  : ""}
              . Se borrarán por completo su cuenta, solicitud, contrato, visitas,
              pagos, moto y archivos en Supabase. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
