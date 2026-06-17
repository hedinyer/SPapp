import { getAllCategorias, getAllProductos } from "@/lib/pipeline/queries";
import { InventarioManager } from "@/components/inventario/inventario-manager";

export default async function InventarioPage() {
  const [categorias, productos] = await Promise.all([
    getAllCategorias(),
    getAllProductos(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Inventario de tienda</h1>
        <p className="mt-1 text-neutral-500">
          Repuestos, lubricantes y accesorios para clientes con moto entregada.
        </p>
      </div>
      <InventarioManager categorias={categorias} productos={productos} />
    </div>
  );
}
