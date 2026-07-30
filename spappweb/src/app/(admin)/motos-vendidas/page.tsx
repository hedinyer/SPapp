import { listMotosVendidas } from "@/lib/actions/historial-motos-actions";
import { MotosVendidasList } from "@/components/motos-vendidas/motos-vendidas-list";
import { AdminHubSubnav } from "@/components/layout/admin-hub-subnav";
import { PageHeader } from "@/components/layout/page-header";

export const dynamic = "force-dynamic";

export default async function MotosVendidasPage() {
  const motos = await listMotosVendidas().catch(() => []);

  return (
    <div className="flex flex-col gap-6">
      <AdminHubSubnav hubId="motos" />
      <PageHeader
        title="Vendidas"
        description="Motos vendidas a crédito o de contado."
      />
      <MotosVendidasList motos={motos} />
    </div>
  );
}
