import { getAllBikes } from "@/lib/pipeline/queries";
import { CatalogoManager } from "@/components/catalogo/catalogo-manager";
import { AdminHubSubnav } from "@/components/layout/admin-hub-subnav";
import { PageHeader } from "@/components/layout/page-header";

export default async function CatalogoPage() {
  const bikes = await getAllBikes();

  return (
    <div className="flex flex-col gap-6">
      <AdminHubSubnav hubId="motos" />
      <PageHeader
        title="Modelos"
        description="Oferta y precios visibles para clientes post-visita."
      />
      <CatalogoManager bikes={bikes} />
    </div>
  );
}
