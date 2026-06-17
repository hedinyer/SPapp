import {
  getAllGarajeMotos,
  getAllGarajeParqueaderos,
} from "@/lib/pipeline/queries";
import { GarajeManager } from "@/components/garaje/garaje-manager";

export default async function GarajePage({
  searchParams,
}: {
  searchParams: Promise<{ fotoPendiente?: string }>;
}) {
  const params = await searchParams;
  const [parqueaderos, motos] = await Promise.all([
    getAllGarajeParqueaderos(),
    getAllGarajeMotos(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Garaje</h1>
        <p className="mt-1 text-neutral-500">
          Inventario físico de motos en parqueaderos: nuevas, segunda mano y
          recuperadas por mora.
        </p>
      </div>
      <GarajeManager
        parqueaderos={parqueaderos}
        motos={motos}
        initialFotoPendiente={params.fotoPendiente === "1"}
      />
    </div>
  );
}
