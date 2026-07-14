import { getVentasContado } from "@/lib/actions/venta-moto-actions";
import { getAvailableBikes } from "@/lib/pipeline/queries";
import { VentaContadoManager } from "@/components/venta-contado/venta-contado-manager";
import { AdminHubSubnav } from "@/components/layout/admin-hub-subnav";
import { PageHeader } from "@/components/layout/page-header";

export default async function VentaContadoPage() {
  const [ventas, bikes] = await Promise.all([
    getVentasContado(),
    getAvailableBikes(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <AdminHubSubnav hubId="motos" />
      <PageHeader
        title="Contado"
        description="Motos vendidas al contado o con abono parcial en mostrador."
      />
      <VentaContadoManager ventas={ventas} bikes={bikes} />
    </div>
  );
}
