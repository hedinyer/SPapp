import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  getActiveVisitadores,
  getAllBikes,
  getAllProductosCredito,
  getClientPipeline,
} from "@/lib/pipeline/queries";
import { ClientPipelineView } from "@/components/pipeline/client-pipeline-view";
import { ClientInfoSummary } from "@/components/clientes/client-info-summary";
import { ClientHeaderActions } from "@/components/clientes/client-header-actions";
import { Button } from "@/components/ui/button";

export default async function ClientPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: userIdStr } = await params;
  const userId = Number(userIdStr);
  if (!Number.isFinite(userId)) notFound();

  const [pipeline, visitadores, bikes, productosCredito] = await Promise.all([
    getClientPipeline(userId),
    getActiveVisitadores(),
    getAllBikes(),
    getAllProductosCredito(),
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
        <ClientHeaderActions pipeline={pipeline} />
      </div>

      <ClientInfoSummary pipeline={pipeline} />

      <ClientPipelineView
        pipeline={pipeline}
        visitadores={visitadores}
        bikes={bikes}
        productosCredito={productosCredito}
      />
    </div>
  );
}
