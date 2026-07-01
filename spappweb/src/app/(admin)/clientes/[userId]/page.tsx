import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  getActiveVisitadores,
  getAllBikes,
  getClientPipeline,
} from "@/lib/pipeline/queries";
import { ClientPipelineView } from "@/components/pipeline/client-pipeline-view";
import { ClientInfoSummary } from "@/components/clientes/client-info-summary";
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

  const [pipeline, visitadores, bikes] = await Promise.all([
    getClientPipeline(userId),
    getActiveVisitadores(),
    getAllBikes(),
  ]);

  if (!pipeline) notFound();

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild className="gap-2 px-0">
        <Link href="/inbox?cola=creditos">
          <ChevronLeft className="h-4 w-4" />
          Volver a clientes
        </Link>
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">{pipeline.displayName}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Usuario @{pipeline.user.user} · ID {pipeline.user.id}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild className="min-h-11">
            <Link href="/hojadevida" target="_blank">
              Formulario web
            </Link>
          </Button>
          {pipeline.currentAdminStep && (
            <Badge className="w-fit bg-black text-white hover:bg-black">
              Acción requerida
            </Badge>
          )}
        </div>
      </div>

      <ClientInfoSummary pipeline={pipeline} />

      <ClientPipelineView
        pipeline={pipeline}
        visitadores={visitadores}
        bikes={bikes}
      />
    </div>
  );
}
