import { CajaProductosManager } from "@/components/caja/caja-productos-manager";

export default function CajaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Caja</h1>
        <p className="mt-1 text-neutral-500">
          Ingresa el código del móvil para cargar el carrito y facturar.
        </p>
      </div>
      <CajaProductosManager />
    </div>
  );
}
