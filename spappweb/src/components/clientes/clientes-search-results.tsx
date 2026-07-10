"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ArrowRight, Bike, FileText, User, X } from "lucide-react";
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

function PhotoThumb({
  src,
  alt,
  fallback,
}: {
  src: string | null;
  alt: string;
  fallback: "user" | "bike";
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className="h-full w-full object-cover" />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-neutral-400">
      {fallback === "user" ? (
        <User className="h-7 w-7" />
      ) : (
        <Bike className="h-7 w-7" />
      )}
    </div>
  );
}

export function ClientesSearchResults({
  results,
  query,
  listTitle,
}: {
  results: ClientSearchResult[];
  query: string;
  listTitle?: string;
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
        {query
          ? `No se encontraron clientes para “${query}”. Prueba con placa, cédula o nombre completo.`
          : "Aún no hay clientes con moto a crédito."}
      </p>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <p className="text-sm text-neutral-500">
          {listTitle ?? `${list.length} resultado${list.length === 1 ? "" : "s"}`}
        </p>
        <ul className="grid gap-4 lg:grid-cols-2">
          {list.map((client) => (
            <li
              key={client.userId}
              className="overflow-hidden rounded-xl border border-neutral-200 bg-white"
            >
              <div className="flex">
                <div className="flex w-[6.5rem] shrink-0 flex-col border-r border-neutral-100 sm:w-32">
                  <div className="relative aspect-square overflow-hidden bg-neutral-50">
                    <PhotoThumb
                      src={client.selfieUrl}
                      alt={`Foto de ${client.displayName}`}
                      fallback="user"
                    />
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      Cliente
                    </span>
                  </div>
                  <div className="relative aspect-square overflow-hidden border-t border-neutral-100 bg-neutral-50">
                    <PhotoThumb
                      src={client.motoImagenUrl}
                      alt={client.motoLabel ? `Moto ${client.motoLabel}` : "Moto"}
                      fallback="bike"
                    />
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      {client.placa ?? "Moto"}
                    </span>
                  </div>
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <Link
                    href={`/clientes/${client.userId}`}
                    className="min-w-0 flex-1 p-4 hover:bg-neutral-50/80"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{client.displayName}</p>
                        {client.matchLabel ? (
                          <Badge variant="secondary" className="text-xs">
                            {client.matchLabel}
                          </Badge>
                        ) : null}
                        {client.compraEstado && (
                          <Badge variant="outline" className="text-xs">
                            {COMPRA_ESTADO_LABELS[client.compraEstado]}
                          </Badge>
                        )}
                        {client.compraEstado &&
                          (client.diasAtraso > 0 ? (
                            <Badge
                              variant="outline"
                              className="border-red-200 bg-red-50 text-xs text-red-800"
                            >
                              {client.diasAtraso} día
                              {client.diasAtraso === 1 ? "" : "s"} atraso
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-emerald-200 bg-emerald-50 text-xs text-emerald-800"
                            >
                              Al día
                            </Badge>
                          ))}
                      </div>
                      <p className="text-sm text-neutral-500">
                        @{client.username}
                        {client.cedula ? ` · C.C. ${client.cedula}` : ""}
                      </p>
                      {(client.placa || client.motoLabel) && (
                        <p className="text-sm text-neutral-600">
                          {client.placa ? `Placa ${client.placa}` : null}
                          {client.placa && client.motoLabel ? " · " : null}
                          {client.motoLabel}
                        </p>
                      )}
                      {client.cuotasPagadas > 0 && (
                        <p className="text-sm text-neutral-600">
                          {client.cuotasPagadas} cuota
                          {client.cuotasPagadas === 1 ? "" : "s"} pagada
                          {client.cuotasPagadas === 1 ? "" : "s"}
                        </p>
                      )}
                    </div>
                  </Link>

                  <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 px-4 py-3">
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
                      className="inline-flex items-center gap-1 text-sm font-medium text-neutral-700 hover:text-black"
                    >
                      Ver ficha
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="ml-auto text-neutral-400 hover:text-red-600"
                      aria-label={`Eliminar ${client.displayName}`}
                      disabled={pending}
                      onClick={() => setToDelete(client)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
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
