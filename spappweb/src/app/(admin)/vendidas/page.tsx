import { getAllVendidasMotos } from "@/lib/pipeline/queries";
import { VendidasManager } from "@/components/vendidas/vendidas-manager";

export default async function VendidasPage() {
  const motos = await getAllVendidasMotos();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Vendidas</h1>
        <p className="mt-1 text-neutral-500">
          Motos entregadas a clientes: estado físico, mora y acciones
          operativas.
        </p>
      </div>
      <VendidasManager motos={motos} />
    </div>
  );
}
