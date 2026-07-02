import { getVentasContado } from "@/lib/actions/venta-moto-actions";
import { getAllBikes } from "@/lib/pipeline/queries";
import { VentaContadoManager } from "@/components/venta-contado/venta-contado-manager";

export default async function VentaContadoPage() {
  const [ventas, bikes] = await Promise.all([getVentasContado(), getAllBikes()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Venta contado</h1>
        <p className="mt-1 text-neutral-500">
          Motos vendidas al contado o con abono parcial en mostrador.
        </p>
      </div>
      <VentaContadoManager ventas={ventas} bikes={bikes} />
    </div>
  );
}
