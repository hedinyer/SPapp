"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bike, Search, User, X } from "lucide-react";
import { toast } from "sonner";
import { deleteClienteSinVisita } from "@/lib/actions/admin-actions";
import type { InboxListItem, InboxQueueId } from "@/lib/pipeline/types";
import { formatCop } from "@/lib/utils/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface InboxQueueListProps {
  items: InboxListItem[];
  queueId: InboxQueueId;
}

type CreditoFiltro = "pendiente" | "aceptada" | "rechazada";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function matchesCreditosSearch(item: InboxListItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [item.displayName, item.cedula, item.username]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function PhotoThumb({
  src,
  alt,
  fallback,
}: {
  src: string | null | undefined;
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
    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
      {fallback === "user" ? (
        <User className="h-7 w-7" />
      ) : (
        <Bike className="h-7 w-7" />
      )}
    </div>
  );
}

export function InboxQueueList({ items, queueId }: InboxQueueListProps) {
  const router = useRouter();
  const [list, setList] = useState(items);
  const [search, setSearch] = useState("");
  const [creditoFiltro, setCreditoFiltro] = useState<CreditoFiltro>("pendiente");
  const [pending, startTransition] = useTransition();
  const [toDelete, setToDelete] = useState<InboxListItem | null>(null);
  const canDelete = queueId === "creditos";
  const isCreditos = queueId === "creditos";
  const isClienteCard = queueId === "recoger" || queueId === "morosos";

  const visibleList = useMemo(
    () =>
      isCreditos
        ? list.filter(
            (item) =>
              item.estadoSolicitud === creditoFiltro &&
              matchesCreditosSearch(item, search),
          )
        : list,
    [isCreditos, list, search, creditoFiltro],
  );

  useEffect(() => {
    setList(items);
  }, [items]);

  function confirmDelete() {
    if (!toDelete) return;
    const { userId, displayName } = toDelete;

    startTransition(async () => {
      try {
        await deleteClienteSinVisita(userId);
        setList((prev) => prev.filter((item) => item.userId !== userId));
        toast.success(`${displayName} eliminado.`);
        setToDelete(null);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo eliminar.");
      }
    });
  }

  if (list.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay items en esta cola.</p>;
  }

  return (
    <div className={isCreditos || isClienteCard ? "flex flex-col gap-4" : undefined}>
      {isCreditos ? (
        <div className="flex flex-col gap-3">
          <Tabs
            value={creditoFiltro}
            onValueChange={(value) =>
              setCreditoFiltro(value as CreditoFiltro)
            }
          >
            <TabsList className="w-full max-w-lg">
              <TabsTrigger value="pendiente" className="flex-1">
                Pendiente
              </TabsTrigger>
              <TabsTrigger value="aceptada" className="flex-1">
                Aprobado
              </TabsTrigger>
              <TabsTrigger value="rechazada" className="flex-1">
                Rechazado
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o cédula…"
              className="min-h-11 pl-9"
            />
          </div>
        </div>
      ) : null}

      {visibleList.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {isCreditos && search.trim()
            ? `No hay clientes que coincidan con "${search.trim()}".`
            : isCreditos
              ? creditoFiltro === "pendiente"
                ? "No hay solicitudes pendientes sin visita."
                : creditoFiltro === "aceptada"
                  ? "No hay clientes con crédito aprobado sin visita."
                  : "No hay clientes con crédito rechazado sin visita."
              : "No hay items en esta cola."}
        </p>
      ) : isClienteCard ? (
        <ul className="grid gap-4 lg:grid-cols-2">
          {visibleList.map((item) => (
            <li
              key={item.userId}
              className="overflow-hidden rounded-xl border border-border bg-background"
            >
              <div className="flex">
                <div className="flex w-[6.5rem] shrink-0 flex-col border-r border-border sm:w-32">
                  <div className="relative aspect-square overflow-hidden bg-muted/50">
                    <PhotoThumb
                      src={item.selfieUrl}
                      alt={`Foto de ${item.displayName}`}
                      fallback="user"
                    />
                    <span className="absolute bottom-1 left-1 rounded bg-foreground/70 px-1.5 py-0.5 text-[10px] font-medium text-background">
                      Cliente
                    </span>
                  </div>
                  <div className="relative aspect-square overflow-hidden border-t border-border bg-muted/50">
                    <PhotoThumb
                      src={item.motoImagenUrl}
                      alt={item.motoLabel ? `Moto ${item.motoLabel}` : "Moto"}
                      fallback="bike"
                    />
                    <span className="absolute bottom-1 left-1 rounded bg-foreground/70 px-1.5 py-0.5 text-[10px] font-medium text-background">
                      {item.placa ?? "Moto"}
                    </span>
                  </div>
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <Link
                    href={`/clientes/${item.userId}`}
                    className="min-w-0 flex-1 p-4 hover:bg-muted/50"
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{item.displayName}</p>
                        {(item.diasAtraso ?? 0) > 0 ? (
                          <Badge
                            variant="outline"
                            className="border-red-200 bg-red-50 text-xs text-red-800"
                          >
                            {item.diasAtraso} día
                            {item.diasAtraso === 1 ? "" : "s"} atraso
                          </Badge>
                        ) : null}
                        {queueId === "recoger" ? (
                          <span className="text-xs font-bold text-red-600">
                            PARA RECOGER
                          </span>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            En mora
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        @{item.username}
                        {item.cedula
                          ? ` · ${item.docLabel ?? "C.C."} ${item.cedula}`
                          : ""}
                      </p>
                      {(item.placa || item.motoLabel) && (
                        <p className="text-sm text-muted-foreground">
                          {item.placa ? `Placa ${item.placa}` : null}
                          {item.placa && item.motoLabel ? " · " : null}
                          {item.motoLabel}
                        </p>
                      )}
                      {(item.montoAdeudado ?? 0) > 0 && (
                        <p className="text-sm font-medium text-red-700">
                          Adeudado {formatCop(item.montoAdeudado ?? 0)}
                        </p>
                      )}
                    </div>
                  </Link>
                  <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/clientes/${item.userId}`}>Abrir ficha</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {visibleList.map((item) => (
            <li
              key={item.userId}
              className="flex items-stretch hover:bg-muted/50"
            >
              <Link
                href={`/clientes/${item.userId}`}
                className="flex min-w-0 flex-1 flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {isCreditos ? (
                    <Avatar size="lg" className="size-12 shrink-0">
                      {item.selfieUrl ? (
                        <AvatarImage
                          src={item.selfieUrl}
                          alt={`Selfie de ${item.displayName}`}
                        />
                      ) : null}
                      <AvatarFallback>
                        {initials(item.displayName)}
                      </AvatarFallback>
                    </Avatar>
                  ) : null}
                  <div className="min-w-0">
                    <p className="font-medium">{item.displayName}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {isCreditos && item.cedula
                        ? `${item.docLabel ?? "C.C."} ${item.cedula} · ${item.subtitle}`
                        : `@${item.username} · ${item.subtitle}`}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-medium text-foreground sm:text-muted-foreground">
                  Abrir →
                </span>
              </Link>
              {canDelete ? (
                <div className="flex shrink-0 items-center pr-2 sm:pr-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Eliminar ${item.displayName}`}
                    disabled={pending}
                    onClick={() => setToDelete(item)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setToDelete(null);
        }}
      >
        <AlertDialogContent className="bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.displayName}
              {toDelete?.cedula
                ? ` (${toDelete.docLabel ?? "C.C."} ${toDelete.cedula})`
                : toDelete
                  ? ` (@${toDelete.username})`
                  : ""}
              . Se borrarán por completo su cuenta, solicitud, contrato, visitas,
              pagos, moto y archivos en Supabase. Esta acción no se puede
              deshacer.
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
    </div>
  );
}
