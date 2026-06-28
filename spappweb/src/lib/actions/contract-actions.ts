"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  colombiaDateParts,
  type ContratoData,
} from "@/lib/contracts/contrato-renting-clausulas";
import {
  generateContratoPdf,
  generateHojaVidaPdf,
} from "@/lib/contracts/contract-pdf";

const BUCKET = "contract-documents";

const signSchema = z.object({
  contractId: z.string().uuid(),
  nombre: z.string().trim().min(1, "Escribe tu nombre"),
  cedula: z.string().trim().min(1, "Escribe tu cédula"),
  direccion: z.string().trim().min(1, "Escribe tu dirección"),
  firmaPngBase64: z.string().regex(/^data:image\/png;base64,/, "Firma inválida"),
});

export async function signContract(input: z.infer<typeof signSchema>) {
  const parsed = signSchema.parse(input);
  const supabase = createAdminClient();

  const { data: contract, error: fetchError } = await supabase
    .from("digital_contracts")
    .select(
      "id, user_id, users_documents_id, status, hoja_vida_data, users_documents(estado_solicitud)",
    )
    .eq("id", parsed.contractId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!contract) throw new Error("Enlace no válido.");
  if (contract.status === "firmado") {
    throw new Error("Este contrato ya fue firmado.");
  }

  const doc = contract.users_documents as
    | { estado_solicitud?: string }
    | { estado_solicitud?: string }[]
    | null;
  const estado = Array.isArray(doc) ? doc[0]?.estado_solicitud : doc?.estado_solicitud;
  if (estado !== "aceptada") {
    throw new Error("El crédito aún no está aprobado.");
  }

  const fecha = colombiaDateParts();
  const contratoData: ContratoData = {
    nombreContratante: parsed.nombre,
    cedulaContratante: parsed.cedula,
    direccionNotificaciones: parsed.direccion,
    fechaFirmaDia: fecha.dia,
    fechaFirmaMes: fecha.mes,
    fechaFirmaAnio: fecha.anio,
  };

  const signatureBuffer = Buffer.from(
    parsed.firmaPngBase64.replace(/^data:image\/png;base64,/, ""),
    "base64",
  );

  const [hojaVidaPdf, contratoPdf] = await Promise.all([
    generateHojaVidaPdf({
      hoja: contract.hoja_vida_data as Record<string, unknown>,
      signatureDataUrl: parsed.firmaPngBase64,
    }),
    generateContratoPdf({
      contrato: contratoData,
      signatureDataUrl: parsed.firmaPngBase64,
    }),
  ]);

  const userId = contract.user_id as number;
  const base = `${userId}/${contract.id}`;
  const signaturePath = `${base}/signature.png`;
  const hojaVidaPath = `${base}/hoja_vida.pdf`;
  const contratoPath = `${base}/contrato.pdf`;

  const uploads = await Promise.all([
    supabase.storage.from(BUCKET).upload(signaturePath, signatureBuffer, {
      contentType: "image/png",
      upsert: true,
    }),
    supabase.storage.from(BUCKET).upload(hojaVidaPath, hojaVidaPdf, {
      contentType: "application/pdf",
      upsert: true,
    }),
    supabase.storage.from(BUCKET).upload(contratoPath, contratoPdf, {
      contentType: "application/pdf",
      upsert: true,
    }),
  ]);
  const uploadError = uploads.find((u) => u.error)?.error;
  if (uploadError) throw new Error(`No se pudo subir el documento. ${uploadError.message}`);

  const { error: updateError } = await supabase
    .from("digital_contracts")
    .update({
      contrato_data: {
        nombre_contratante: parsed.nombre,
        cedula_contratante: parsed.cedula,
        direccion_notificaciones: parsed.direccion,
        fecha_firma_dia: fecha.dia,
        fecha_firma_mes: fecha.mes,
        fecha_firma_anio: fecha.anio,
        clausulas_aceptadas: true,
      },
      signature_path: signaturePath,
      hoja_vida_pdf_path: hojaVidaPath,
      contrato_pdf_path: contratoPath,
      status: "firmado",
      signed_at: new Date().toISOString(),
    })
    .eq("id", contract.id);

  if (updateError) throw new Error(updateError.message);

  revalidatePath("/inbox");
  revalidatePath(`/clientes/${userId}`);
  return { ok: true };
}
