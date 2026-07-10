"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bike, ShoppingBag, Store } from "lucide-react";
import { refreshInboxQueues } from "@/lib/actions/inbox-actions";
import { createAnonClient } from "@/lib/supabase/anon";
import type { BikeRow, InboxQueue } from "@/lib/pipeline/types";
import { QueueCards } from "@/components/inbox/queue-cards";
import { VenderMotoSheet } from "@/components/inbox/vender-moto-sheet";
import { VenderProductosSheet } from "@/components/inbox/vender-productos-sheet";
import { isMobileTouchDevice } from "@/lib/venta/start-qr-scanner";
import { Button } from "@/components/ui/button";

const INBOX_REALTIME_TABLES = [
  "users_documents",
  "visitas",
  "user_moto_compra",
  "morosos",
  "motos_para_recoger",
  "solicitudes_taller",
] as const;

interface InboxQueuesLiveProps {
  initialQueues: InboxQueue[];
  bikes: BikeRow[];
}

function pendingSummary(total: number) {
  if (total === 0) return "Todo al día. No hay tareas pendientes.";
  return `${total} tarea${total === 1 ? "" : "s"} pendiente${total === 1 ? "" : "s"}.`;
}

export function InboxQueuesLive({ initialQueues, bikes }: InboxQueuesLiveProps) {
  const [queues, setQueues] = useState(initialQueues);
  const [venderOpen, setVenderOpen] = useState(false);
  const [productosOpen, setProductosOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshingRef = useRef(false);

  useEffect(() => {
    setQueues(initialQueues);
  }, [initialQueues]);

  const refreshQueues = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;

      void refreshInboxQueues()
        .then(setQueues)
        .catch(() => undefined)
        .finally(() => {
          refreshingRef.current = false;
        });
    }, 300);
  }, []);

  useEffect(() => {
    const supabase = createAnonClient();
    const channel = supabase.channel("inbox_queues");

    for (const table of INBOX_REALTIME_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        refreshQueues,
      );
    }

    void channel.subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      void supabase.removeChannel(channel);
    };
  }, [refreshQueues]);

  const totalPending = queues.reduce((sum, queue) => sum + queue.count, 0);
  const desktop = !isMobileTouchDevice();

  return (
    <div className="space-y-8">
      <div className="grid items-start gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Bandeja</h1>
          <p className="mt-1 text-neutral-500">{pendingSummary(totalPending)}</p>
        </div>
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          <Image
            src="/beralogo.jpg"
            alt="Bera"
            width={120}
            height={48}
            className="h-10 w-auto object-contain sm:h-12"
            priority
          />
          <Image
            src="/logosolucionesgarrido.jpg"
            alt="Soluciones Garrido"
            width={160}
            height={48}
            className="h-10 w-auto object-contain sm:h-12"
            priority
          />
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {desktop ? (
            <Button type="button" variant="outline" className="gap-2" asChild>
              <Link href="/caja">
                <Store className="h-4 w-4" />
                Abrir caja
              </Link>
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => setProductosOpen(true)}
          >
            <ShoppingBag className="h-4 w-4" />
            Venta productos
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => setVenderOpen(true)}
          >
            <Bike className="h-4 w-4" />
            Vender moto
          </Button>
        </div>
      </div>
      <QueueCards queues={queues} />
      <VenderMotoSheet
        bikes={bikes}
        open={venderOpen}
        onOpenChange={setVenderOpen}
      />
      <VenderProductosSheet
        open={productosOpen}
        onOpenChange={setProductosOpen}
      />
    </div>
  );
}
