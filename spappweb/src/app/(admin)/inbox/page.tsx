import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getInboxListItems, getInboxQueues } from "@/lib/pipeline/queries";
import { InboxQueuesLive } from "@/components/inbox/inbox-queues-live";
import { queueTitle } from "@/components/inbox/queue-cards";
import type { InboxQueueId } from "@/lib/pipeline/types";
import { Button } from "@/components/ui/button";

const VALID_QUEUES: InboxQueueId[] = [
  "creditos",
  "visitas_sin_asignar",
  "visitas_programadas",
  "pagos",
  "retiro",
  "entrega",
  "morosos",
  "recoger",
  "solicitudes_taller",
];

function parseQueue(value: string | undefined): InboxQueueId | null {
  if (!value) return null;
  return VALID_QUEUES.includes(value as InboxQueueId)
    ? (value as InboxQueueId)
    : null;
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ cola?: string }>;
}) {
  const params = await searchParams;
  const queueId = parseQueue(params.cola);
  const [queues, items] = await Promise.all([
    getInboxQueues(),
    queueId ? getInboxListItems(queueId) : Promise.resolve([]),
  ]);

  if (!queueId) {
    return <InboxQueuesLive initialQueues={queues} />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Bandeja</h1>
        <p className="mt-1 text-neutral-500">Cola de trabajo activa.</p>
      </div>

      <div className="space-y-4">
        <Button variant="ghost" asChild className="gap-2 px-0">
          <Link href="/inbox">
            <ChevronLeft className="h-4 w-4" />
            Volver a bandeja
          </Link>
        </Button>
        <h2 className="text-lg font-medium">{queueTitle(queueId)}</h2>
        {items.length === 0 ? (
          <p className="text-sm text-neutral-500">No hay items en esta cola.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
            {items.map((item) => (
              <li key={item.userId}>
                <Link
                  href={`/clientes/${item.userId}`}
                  className="flex flex-col gap-2 px-4 py-4 hover:bg-neutral-50 sm:flex-row sm:items-center sm:justify-between"
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
