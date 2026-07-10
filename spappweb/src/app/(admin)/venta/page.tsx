import Link from "next/link";
import { VentaManager } from "@/components/venta/venta-manager";
import { getCajaSesionHoy } from "@/lib/actions/caja-actions";

export default async function VentaPage() {
  const sesion = await getCajaSesionHoy().catch(() => null);
  const cajaAbierta = Boolean(sesion?.abierta);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Venta</h1>
        <p className="mt-1 text-neutral-500">
          Escanea repuestos, arma el carrito y envía la cotización por WhatsApp.
        </p>
      </div>
      {!cajaAbierta ? (
        <Link
          href="/caja"
          className="caja-monto-blink block rounded-xl px-4 py-4 text-center text-base font-black sm:text-lg"
        >
          Caja aún no abierta. Abre la caja para empezar a vender.
        </Link>
      ) : null}
      <VentaManager />
    </div>
  );
}
