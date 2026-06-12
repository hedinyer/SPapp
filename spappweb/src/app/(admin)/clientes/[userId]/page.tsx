import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  getActiveVisitadores,
  getClientPipeline,
} from "@/lib/pipeline/queries";
import { ClientPipelineView } from "@/components/pipeline/client-pipeline-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function ClientPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: userIdStr } = await params;
  const userId = Number(userIdStr);
  if (!Number.isFinite(userId)) notFound();

  const [pipeline, visitadores] = await Promise.all([
    getClientPipeline(userId),
    getActiveVisitadores(),
  ]);

  if (!pipeline) notFound();

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild className="gap-2 px-0">
        <Link href="/inbox">
          <ChevronLeft className="h-4 w-4" />
          Volver a bandeja
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{pipeline.displayName}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Usuario @{pipeline.user.user} · ID {pipeline.user.id}
          </p>
        </div>
        {pipeline.currentAdminStep && (
          <Badge className="bg-black text-white hover:bg-black">
            Acción requerida
          </Badge>
        )}
      </div>

      <ClientPipelineView pipeline={pipeline} visitadores={visitadores} />
    </div>
  );
}
