import { VentaManager } from "@/components/venta/venta-manager";

export default function VentaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Venta</h1>
        <p className="mt-1 text-neutral-500">
          Escanea repuestos, arma el carrito y envía la cotización por WhatsApp.
        </p>
      </div>
      <VentaManager />
    </div>
  );
}
