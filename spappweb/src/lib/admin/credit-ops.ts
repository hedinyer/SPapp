import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export type CreditOpResult =
  | { ok: true; contractId?: string }
  | { ok: false; error: string };

function mapDbError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("permission denied")) {
    return "Sin permisos para actualizar en la base de datos.";
  }
  return message;
}

async function ensureContractId(
  supabase: SupabaseClient,
  userId: number,
  documentId: number,
): Promise<string> {
  const { data: existing } = await supabase
    .from("digital_contracts")
    .select("id")
    .eq("user_id", userId)
    .eq("users_documents_id", documentId)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data, error } = await supabase
    .from("digital_contracts")
    .insert({
      user_id: userId,
      users_documents_id: documentId,
      status: "borrador",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function approveCreditOp(
  documentId: number,
  userId: number,
): Promise<CreditOpResult> {
  const docId = Number(documentId);
  const uid = Number(userId);
  if (!Number.isFinite(docId) || !Number.isFinite(uid)) {
    return { ok: false, error: "Datos de solicitud inválidos." };
  }

  const supabase = createAdminClient();
  const { data: updated, error } = await supabase
    .from("users_documents")
    .update({
      estado_solicitud: "aceptada",
      hora_actualizacion: new Date().toISOString(),
    })
    .eq("id", docId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: mapDbError(error.message) };
  if (!updated) {
    return { ok: false, error: "Solicitud no encontrada o sin permisos." };
  }

  try {
    const contractId = await ensureContractId(supabase, uid, docId);
    return { ok: true, contractId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo crear el contrato.",
    };
  }
}

const rejectSchema = z.object({
  documentId: z.number().int().positive(),
  userId: z.number().int().positive(),
  motivo: z.string().min(3, "Escribe un motivo de al menos 3 caracteres"),
  betado: z.boolean(),
});

export async function rejectCreditOp(
  input: z.infer<typeof rejectSchema>,
): Promise<CreditOpResult> {
  const parsed = rejectSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const supabase = createAdminClient();
  const { data: updated, error } = await supabase
    .from("users_documents")
    .update({
      estado_solicitud: "rechazada",
      motivo_rechazo: parsed.data.motivo.trim(),
      betado: parsed.data.betado,
      hora_actualizacion: new Date().toISOString(),
    })
    .eq("id", parsed.data.documentId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: mapDbError(error.message) };
  if (!updated) {
    return { ok: false, error: "Solicitud no encontrada o sin permisos." };
  }

  return { ok: true };
}
