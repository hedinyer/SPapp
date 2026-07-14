import {
  getAllBikes,
  getAllGarajeMotos,
  getAllGarajeParqueaderos,
  getAllProductos,
  getGarajeMantenimientoItems,
} from "@/lib/pipeline/queries";
import { GarajeManager } from "@/components/garaje/garaje-manager";
import { AdminHubSubnav } from "@/components/layout/admin-hub-subnav";
import { PageHeader } from "@/components/layout/page-header";
import type { GarajeMantenimientoItemRow } from "@/lib/pipeline/types";

export default async function GarajePage({
  searchParams,
}: {
  searchParams: Promise<{ fotoPendiente?: string }>;
}) {
  const params = await searchParams;
  const [parqueaderos, motos, productos, bikes] = await Promise.all([
    getAllGarajeParqueaderos(),
    getAllGarajeMotos(),
    getAllProductos(),
    getAllBikes(),
  ]);

  const stockNuevo = bikes.filter((b) => b.activo && b.stock > 0);

  const motosConMantenimiento = motos.filter(
    (m) =>
      m.estado === "en_mantenimiento" ||
      m.estado === "disponible" ||
      m.estado === "retenida",
  );

  const mantenimientoEntries = await Promise.all(
    motosConMantenimiento.map(async (m) => {
      const items = await getGarajeMantenimientoItems(m.id);
      return [m.id, items] as const;
    }),
  );

  const mantenimientoByMoto: Record<string, GarajeMantenimientoItemRow[]> =
    Object.fromEntries(mantenimientoEntries);

  return (
    <div className="flex flex-col gap-6">
      <AdminHubSubnav hubId="motos" />
      <PageHeader
        title="Garaje"
        description="Unidades físicas en parqueaderos: nuevas, segunda mano y recuperadas por mora."
      />
      <GarajeManager
        parqueaderos={parqueaderos}
        motos={motos}
        stockNuevo={stockNuevo}
        productos={productos}
        mantenimientoByMoto={mantenimientoByMoto}
        initialFotoPendiente={params.fotoPendiente === "1"}
      />
    </div>
  );
}
