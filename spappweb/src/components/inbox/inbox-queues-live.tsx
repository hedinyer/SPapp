"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { refreshInboxQueues } from "@/lib/actions/inbox-actions";
import { createAnonClient } from "@/lib/supabase/anon";
import type { InboxQueue } from "@/lib/pipeline/types";
import { QueueCards } from "@/components/inbox/queue-cards";

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
}

function pendingSummary(total: number) {
  if (total === 0) return "Todo al día. No hay tareas pendientes.";
  return `${total} tarea${total === 1 ? "" : "s"} pendiente${total === 1 ? "" : "s"}.`;
}

export function InboxQueuesLive({ initialQueues }: InboxQueuesLiveProps) {
  const [queues, setQueues] = useState(initialQueues);
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Bandeja</h1>
        <p className="mt-1 text-neutral-500">{pendingSummary(totalPending)}</p>
      </div>
      <QueueCards queues={queues} />
    </div>
  );
}
