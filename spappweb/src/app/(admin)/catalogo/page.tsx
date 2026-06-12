import { getAllBikes } from "@/lib/pipeline/queries";
import { CatalogoManager } from "@/components/catalogo/catalogo-manager";

export default async function CatalogoPage() {
  const bikes = await getAllBikes();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Catálogo de motos</h1>
        <p className="mt-1 text-neutral-500">
          Inventario visible para clientes post-visita.
        </p>
      </div>
      <CatalogoManager bikes={bikes} />
    </div>
  );
}
