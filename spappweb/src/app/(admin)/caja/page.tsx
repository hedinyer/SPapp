import { CajaCuadrePanel } from "@/components/caja/caja-cuadre-panel";
import { CajaProductosManager } from "@/components/caja/caja-productos-manager";
import { getCajaSesionHoy } from "@/lib/actions/caja-actions";

export default async function CajaPage() {
  const sesion = await getCajaSesionHoy().catch(() => null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Caja</h1>
        <p className="mt-1 text-neutral-500">
          Abre y cierra la caja del día, y factura carritos del móvil.
        </p>
      </div>
      <CajaCuadrePanel initialSesion={sesion} />
      <CajaProductosManager />
    </div>
  );
}
