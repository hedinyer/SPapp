import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAllGarajeParqueaderos } from "@/lib/pipeline/queries";
import { NewMotoForm } from "@/components/garaje/new-moto-form";

export default async function NuevaMotoGarajePage() {
  const parqueaderos = await getAllGarajeParqueaderos();
  const parqueaderosActivos = parqueaderos.filter((p) => p.activo);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/garaje"
          className="inline-flex min-h-11 touch-manipulation items-center gap-2 text-sm font-medium text-neutral-600 hover:text-black"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al garaje
        </Link>
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Registrar moto</h1>
          <p className="mt-1 text-neutral-500">
            Agrega una moto nueva al inventario del garaje.
          </p>
        </div>
      </div>
      <NewMotoForm parqueaderos={parqueaderosActivos} />
    </div>
  );
}
