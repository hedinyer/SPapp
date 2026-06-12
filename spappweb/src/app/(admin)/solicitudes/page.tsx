import { getAllSolicitudesTaller } from "@/lib/pipeline/queries";
import { SolicitudesManager } from "@/components/solicitudes/solicitudes-manager";

export default async function SolicitudesPage() {
  const solicitudes = await getAllSolicitudesTaller();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Solicitudes de taller</h1>
        <p className="mt-1 text-neutral-500">
          Repuestos, reparaciones y cambios de aceite solicitados por clientes.
        </p>
      </div>
      <SolicitudesManager solicitudes={solicitudes} />
    </div>
  );
}
