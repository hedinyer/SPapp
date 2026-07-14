import { getAllVisitadores } from "@/lib/pipeline/queries";
import { VisitadoresManager } from "@/components/visitadores/visitadores-manager";
import { PageHeader } from "@/components/layout/page-header";

export default async function VisitadoresPage() {
  const visitadores = await getAllVisitadores();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Visitadores"
        description="Personas que realizan visitas domiciliarias."
      />
      <VisitadoresManager visitadores={visitadores} />
    </div>
  );
}
