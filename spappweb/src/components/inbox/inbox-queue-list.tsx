"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { deleteClienteSinVisita } from "@/lib/actions/admin-actions";
import type { InboxListItem, InboxQueueId } from "@/lib/pipeline/types";
import { Button } from "@/components/ui/button";
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

interface InboxQueueListProps {
  items: InboxListItem[];
  queueId: InboxQueueId;
}

export function InboxQueueList({ items, queueId }: InboxQueueListProps) {
  const router = useRouter();
  const [list, setList] = useState(items);
  const [pending, startTransition] = useTransition();
  const [toDelete, setToDelete] = useState<InboxListItem | null>(null);
  const canDelete = queueId === "creditos";

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
    return <p className="text-sm text-neutral-500">No hay items en esta cola.</p>;
  }

  return (
    <>
      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
        {list.map((item) => (
          <li
            key={item.userId}
            className="flex items-stretch hover:bg-neutral-50"
          >
            <Link
              href={`/clientes/${item.userId}`}
              className="flex min-w-0 flex-1 flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium">{item.displayName}</p>
                <p className="truncate text-sm text-neutral-500">
                  @{item.username} · {item.subtitle}
                </p>
              </div>
              <span className="text-sm font-medium text-black sm:text-neutral-400">
                Abrir →
              </span>
            </Link>
            {canDelete ? (
              <div className="flex shrink-0 items-center pr-2 sm:pr-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-neutral-400 hover:text-red-600"
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
              {toDelete ? ` (@${toDelete.username})` : ""}. Se borrarán su
              cuenta, solicitud, contrato y documentos de Supabase. Esta acción no
              se puede deshacer.
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
