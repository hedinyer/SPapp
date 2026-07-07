import { listVentasProductoHistorial } from "@/lib/actions/venta-producto-actions";
import { HistorialVentasClient } from "@/components/historial-ventas/historial-ventas-client";

export const dynamic = "force-dynamic";

export default async function HistorialVentasPage() {
  const ventas = await listVentasProductoHistorial().catch(() => []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Historial de ventas</h1>
        <p className="mt-1 text-neutral-500">
          Productos de inventario vendidos en mostrador, del más reciente al más
          antiguo.
        </p>
      </div>

      <HistorialVentasClient ventas={ventas} />
    </div>
  );
}
