import { getAllVisitadores } from "@/lib/pipeline/queries";
import { VisitadoresManager } from "@/components/visitadores/visitadores-manager";

export default async function VisitadoresPage() {
  const visitadores = await getAllVisitadores();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Visitadores</h1>
        <p className="mt-1 text-neutral-500">
          Personas que realizan visitas domiciliarias.
        </p>
      </div>
      <VisitadoresManager visitadores={visitadores} />
    </div>
  );
}
