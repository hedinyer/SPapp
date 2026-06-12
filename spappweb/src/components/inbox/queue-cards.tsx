import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { InboxQueue, InboxQueueId } from "@/lib/pipeline/types";

interface QueueCardsProps {
  queues: InboxQueue[];
}

export function QueueCards({ queues }: QueueCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {queues.map((queue) => (
        <QueueCard key={queue.id} queue={queue} />
      ))}
    </div>
  );
}

function QueueCard({ queue }: { queue: InboxQueue }) {
  const href =
    queue.count > 0
      ? `/inbox?cola=${queue.id}`
      : `/inbox?cola=${queue.id}`;

  return (
    <Link href={href}>
      <Card className="border-neutral-200 shadow-none transition-colors hover:border-neutral-400">
        <CardContent className="flex items-start justify-between p-6">
          <div>
            <p className="text-4xl font-semibold tabular-nums text-black">
              {queue.count}
            </p>
            <p className="mt-2 text-base font-medium text-black">
              {queue.label}
            </p>
            <p className="mt-1 text-sm text-neutral-500">{queue.description}</p>
          </div>
          <ArrowRight className="mt-1 h-5 w-5 text-neutral-400" strokeWidth={1.5} />
        </CardContent>
      </Card>
    </Link>
  );
}

export function queueTitle(id: InboxQueueId): string {
  const map: Record<InboxQueueId, string> = {
    creditos: "Solicitudes de crédito",
    visitas_sin_asignar: "Visitas sin asignar",
    visitas_programadas: "Visitas programadas",
    pagos: "Pagos por confirmar",
    retiro: "Preparar retiro",
    entrega: "Registrar entrega",
    morosos: "Clientes en mora",
    recoger: "Motos para recoger",
    solicitudes_taller: "Solicitudes de taller",
  };
  return map[id];
}
