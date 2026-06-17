import { CrearClienteForm } from "@/components/clientes/crear-cliente-form";

export default function CrearClientePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Crear cliente</h1>
        <p className="mt-1 text-neutral-500">
          Registra un nuevo usuario en la app con solo la cédula del cliente.
        </p>
      </div>
      <CrearClienteForm />
    </div>
  );
}
