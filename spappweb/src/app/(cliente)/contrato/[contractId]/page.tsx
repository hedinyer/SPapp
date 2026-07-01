import { createAdminClient } from "@/lib/supabase/admin";
import {
  TIPO_IDENTIFICACION_LABELS,
  parseHojaVidaForm,
} from "@/lib/contracts/hoja-vida-schema";
import { ContractSignFlow } from "@/components/contrato/contract-sign-flow";

export const metadata = { title: "Firmar contrato" };

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border-2 border-neutral-200 bg-white p-6 text-center">
      <h1 className="text-xl font-bold text-black">{title}</h1>
      <p className="mt-2 text-base leading-relaxed text-neutral-600">{body}</p>
    </div>
  );
}

export default async function ContratoPage({
  params,
}: {
  params: Promise<{ contractId: string }>;
}) {
  const { contractId } = await params;

  const supabase = createAdminClient();
  const { data: contract } = await supabase
    .from("digital_contracts")
    .select(
      "id, user_id, status, hoja_vida_data, users_documents(estado_solicitud)",
    )
    .eq("id", contractId)
    .maybeSingle();

  if (!contract) {
    return (
      <Notice
        title="Enlace no válido"
        body="No encontramos este contrato. Pide a tu asesor un nuevo enlace."
      />
    );
  }

  const doc = contract.users_documents as
    | { estado_solicitud?: string }
    | { estado_solicitud?: string }[]
    | null;
  const estado = Array.isArray(doc) ? doc[0]?.estado_solicitud : doc?.estado_solicitud;

  if (estado !== "aceptada") {
    return (
      <Notice
        title="Crédito aún no aprobado"
        body="Cuando tu crédito sea aprobado podrás firmar el contrato desde este enlace."
      />
    );
  }

  if (contract.status === "firmado") {
    return (
      <Notice
        title="Contrato ya firmado"
        body="Este contrato ya fue firmado. No necesitas hacer nada más."
      />
    );
  }

  const { data: compra } = await supabase
    .from("user_moto_compra")
    .select("placa, chasis, modelo, color")
    .eq("user_id", contract.user_id)
    .maybeSingle();

  if (!compra?.placa?.trim() || !compra?.chasis?.trim()) {
    return (
      <Notice
        title="Moto aún no asignada"
        body="Tu asesor debe asignar la moto y la placa antes de que puedas firmar. Te avisaremos cuando esté listo."
      />
    );
  }

  const hoja = parseHojaVidaForm(
    contract.hoja_vida_data as Record<string, unknown>,
  );
  const tipoLabel = hoja.tipo_identificacion
    ? TIPO_IDENTIFICACION_LABELS[hoja.tipo_identificacion]
    : "";

  return (
    <ContractSignFlow
      contractId={contract.id}
      prefill={{
        nombre: hoja.nombre_completo,
        cedula: hoja.numero_identificacion,
        direccion: hoja.direccion,
      }}
      resumen={{
        nombre: hoja.nombre_completo,
        documento: `${tipoLabel} ${hoja.numero_identificacion}`.trim(),
        celular: hoja.celular,
        correo: hoja.correo,
      }}
    />
  );
}
