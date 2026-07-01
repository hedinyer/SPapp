import { getAllProductosCredito } from "@/lib/pipeline/queries";
import { ProductosCreditoManager } from "@/components/productos-credito/productos-credito-manager";

export default async function ProductosCreditoPage() {
  const productos = await getAllProductosCredito();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Productos a crédito</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Accesorios y extras que el cliente puede llevarse a cuotas (inicial +
          cuota diaria). Se asignan en el paso de pago del cliente.
        </p>
      </div>
      <ProductosCreditoManager productos={productos} />
    </div>
  );
}
