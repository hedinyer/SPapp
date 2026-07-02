"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { emitPagoCompletoOnTransition } from "@/lib/agent/pipeline-events";
import { requireAdminSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKETS } from "@/lib/supabase/storage-buckets";
import {
  faltanteConcepto,
  type PrimerPagoConcepto,
} from "@/lib/payments/primer-pago-progress";
import { getStoragePublicUrl } from "@/lib/utils/storage-urls";
import {
  isReferenciaDuplicada,
  normalizeReferencia,
} from "@/lib/payments/referencia";
import type {
  BancoOrigen,
  ContextoPago,
  MedioPagoAdmin,
  PagoRow,
  UserMotoCompraRow,
} from "@/lib/pipeline/types";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const MEDIO_PAGO_ADMIN_VALUES = ["nequi_nicolas", "davivienda"] as const;

function revalidateClient(userId: number) {
  revalidatePath("/inbox");
  revalidatePath(`/clientes/${userId}`);
}

async function assertAdmin() {
  await requireAdminSession();
  return createAdminClient();
}

function extensionFor(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

function validateImageFile(file: unknown): File {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Selecciona una imagen del comprobante.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("La imagen no puede superar 5 MB.");
  }
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Usa JPG, PNG o WebP.");
  }
  return file;
}

function optionalImageFile(file: unknown): File | null {
  if (!(file instanceof File) || file.size === 0) return null;
  return validateImageFile(file);
}

function medioPagoUsuarioFromAdmin(
  medio: MedioPagoAdmin,
): "nequi" | "davivienda" {
  if (medio === "davivienda") return "davivienda";
  return "nequi";
}

async function assertReferenciaUnicaPorCliente(
  supabase: Awaited<ReturnType<typeof assertAdmin>>,
  userId: number,
  referencia: string,
) {
  const normalizada = normalizeReferencia(referencia);
  if (!normalizada) {
    throw new Error("Ingresa la referencia.");
  }

  const { data, error } = await supabase
    .from("pagos")
    .select("id, referencia")
    .eq("user_id", userId)
    .not("referencia", "is", null);

  if (error) throw new Error(error.message);

  if (
    isReferenciaDuplicada(
      normalizada,
      (data ?? []).map((row) => String(row.referencia)),
    )
  ) {
    throw new Error("Esta referencia ya fue usada en otro pago de este cliente.");
  }
}

async function assertConceptoNoCubierto(
  supabase: Awaited<ReturnType<typeof assertAdmin>>,
  compraId: string,
  contexto: PrimerPagoConcepto,
) {
  const { data: compra, error: compraError } = await supabase
    .from("user_moto_compra")
    .select(
      "id, cuota_inicial_monto, monto_cuota_periodo, estado, pago_inicial_confirmado, pago_cuota_confirmado",
    )
    .eq("id", compraId)
    .maybeSingle();

  if (compraError) throw new Error(compraError.message);
  if (!compra) throw new Error("Compra no encontrada.");

  if (compra.estado !== "pendiente_pago" && compra.estado !== "lista_retiro") {
    throw new Error("No se pueden registrar abonos en este estado.");
  }

  const { data: pagos, error: pagosError } = await supabase
    .from("pagos")
    .select(
      "id, monto, contexto_pago, estado, medio_pago_admin, user_moto_compra_id, user_id, referencia, comprobante_url, origen, reportado_at, confirmado_at, confirmado_por, fecha_comprobante, tarifa_objetivo_id, notas_admin, created_at, updated_at, dias_cubiertos, medio_pago_usuario",
    )
    .eq("user_moto_compra_id", compraId)
    .eq("estado", "confirmado");

  if (pagosError) throw new Error(pagosError.message);

  const faltante = faltanteConcepto(
    compra as UserMotoCompraRow,
    (pagos ?? []) as PagoRow[],
    contexto,
  );

  if (faltante <= 0) {
    throw new Error(
      contexto === "inicial"
        ? "La cuota inicial ya está cubierta."
        : "La cuota adelantada ya está cubierta.",
    );
  }

  return { compra: compra as UserMotoCompraRow, faltante };
}

export async function checkReferenciaPagoUsada(input: {
  userId: number;
  referencia: string;
}): Promise<{ duplicada: boolean }> {
  await requireAdminSession();
  const supabase = createAdminClient();
  const normalizada = normalizeReferencia(input.referencia);
  if (!normalizada) return { duplicada: false };

  const { data, error } = await supabase
    .from("pagos")
    .select("referencia")
    .eq("user_id", input.userId)
    .not("referencia", "is", null);

  if (error) throw new Error(error.message);

  return {
    duplicada: isReferenciaDuplicada(
      normalizada,
      (data ?? []).map((row) => String(row.referencia)),
    ),
  };
}

const confirmPagoSchema = z.object({
  userId: z.number(),
  compraId: z.string().uuid(),
  contexto: z.enum(["tarifa", "inicial", "cuota_adelantada"]),
  tarifaId: z.string().uuid().optional(),
  referencia: z.string().optional(),
  monto: z.number().int().positive("El monto debe ser mayor a 0"),
  fechaComprobante: z.string().optional(),
  medioPagoAdmin: z.enum(MEDIO_PAGO_ADMIN_VALUES),
  bancoOrigen: z.enum(["nequi", "davivienda", "otro"]),
  entradaManual: z.boolean(),
  notas: z.string().optional(),
});

export async function confirmPagoConComprobante(
  formData: FormData,
): Promise<{ ok: true }> {
  const supabase = await assertAdmin();

  const parsed = confirmPagoSchema.parse({
    userId: Number(formData.get("userId")),
    compraId: String(formData.get("compraId")),
    contexto: String(formData.get("contexto")) as ContextoPago,
    tarifaId: formData.get("tarifaId")
      ? String(formData.get("tarifaId"))
      : undefined,
    referencia: formData.get("referencia")
      ? String(formData.get("referencia")).trim()
      : undefined,
    monto: Number(formData.get("monto")),
    fechaComprobante: formData.get("fechaComprobante")
      ? String(formData.get("fechaComprobante"))
      : undefined,
    medioPagoAdmin: String(
      formData.get("medioPagoAdmin"),
    ) as MedioPagoAdmin,
    bancoOrigen: String(formData.get("bancoOrigen")) as BancoOrigen,
    entradaManual: formData.get("entradaManual") === "true",
    notas: formData.get("notas")
      ? String(formData.get("notas"))
      : undefined,
  });

  const isPrimerPago =
    parsed.contexto === "inicial" || parsed.contexto === "cuota_adelantada";
  const file = optionalImageFile(formData.get("file"));

  if (parsed.contexto === "tarifa" && !parsed.tarifaId) {
    throw new Error("Falta la tarifa a confirmar.");
  }

  if (parsed.contexto === "tarifa" && !file) {
    throw new Error("Sube el comprobante de pago.");
  }

  if (isPrimerPago && !file) {
    throw new Error("Sube el comprobante de pago.");
  }

  if (isPrimerPago) {
    await assertConceptoNoCubierto(
      supabase,
      parsed.compraId,
      parsed.contexto as PrimerPagoConcepto,
    );
  }

  if (parsed.contexto === "tarifa") {
    const { data: tarifa, error: tarifaError } = await supabase
      .from("tarifas_pagadas")
      .select("id, estado, monto_esperado")
      .eq("id", parsed.tarifaId!)
      .maybeSingle();

    if (tarifaError) throw new Error(tarifaError.message);
    if (!tarifa) throw new Error("Tarifa no encontrada.");
    if (tarifa.estado === "pagada") {
      throw new Error("Esta tarifa ya está pagada.");
    }
  }

  const referencia = parsed.referencia?.trim() ?? "";
  if (!referencia) {
    throw new Error("Ingresa la referencia.");
  }

  await assertReferenciaUnicaPorCliente(
    supabase,
    parsed.userId,
    referencia,
  );

  let comprobanteUrl: string | null = null;
  if (file) {
    const path = `${parsed.userId}/${parsed.compraId}/${Date.now()}.${extensionFor(file.type)}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKETS.pagosComprobantes)
      .upload(path, bytes, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`No se pudo subir el comprobante: ${uploadError.message}`);
    }

    comprobanteUrl = getStoragePublicUrl(
      STORAGE_BUCKETS.pagosComprobantes,
      path,
    );
    if (!comprobanteUrl) {
      throw new Error("No se pudo obtener la URL del comprobante.");
    }
  }

  const fechaComprobante = parsed.fechaComprobante?.trim() ?? "";
  if (!fechaComprobante) {
    throw new Error("Ingresa la fecha del comprobante.");
  }

  const notasAdmin = [
    parsed.notas?.trim(),
    parsed.entradaManual ? "Entrada manual" : null,
    parsed.bancoOrigen === "otro" ? "Otro banco" : null,
  ]
    .filter(Boolean)
    .join(" · ") || null;

  const { data: compraBefore } = await supabase
    .from("user_moto_compra")
    .select("estado")
    .eq("id", parsed.compraId)
    .maybeSingle();

  const { error: insertError } = await supabase.from("pagos").insert({
    user_moto_compra_id: parsed.compraId,
    user_id: parsed.userId,
    monto: parsed.monto,
    medio_pago_usuario: medioPagoUsuarioFromAdmin(parsed.medioPagoAdmin),
    medio_pago_admin: parsed.medioPagoAdmin,
    referencia: normalizeReferencia(referencia),
    comprobante_url: comprobanteUrl,
    origen: "admin",
    estado: "confirmado",
    confirmado_at: new Date().toISOString(),
    confirmado_por: "admin",
    fecha_comprobante: fechaComprobante,
    tarifa_objetivo_id:
      parsed.contexto === "tarifa" ? parsed.tarifaId! : null,
    contexto_pago: parsed.contexto,
    notas_admin: notasAdmin,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      throw new Error("Esta referencia ya fue usada en otro pago de este cliente.");
    }
    throw new Error(insertError.message);
  }

  await emitPagoCompletoOnTransition(
    parsed.userId,
    parsed.compraId,
    compraBefore?.estado as string | null,
  );

  revalidateClient(parsed.userId);
  return { ok: true };
}

export async function removePagoAbono(
  pagoId: string,
  userId: number,
): Promise<{ ok: true }> {
  const supabase = await assertAdmin();

  const { data: pago, error: pagoError } = await supabase
    .from("pagos")
    .select("id, contexto_pago, user_moto_compra_id")
    .eq("id", pagoId)
    .maybeSingle();

  if (pagoError) throw new Error(pagoError.message);
  if (!pago) throw new Error("Abono no encontrado.");

  if (
    pago.contexto_pago !== "inicial" &&
    pago.contexto_pago !== "cuota_adelantada"
  ) {
    throw new Error("Solo se pueden eliminar abonos del primer pago.");
  }

  const { data: compra, error: compraError } = await supabase
    .from("user_moto_compra")
    .select("estado")
    .eq("id", pago.user_moto_compra_id)
    .maybeSingle();

  if (compraError) throw new Error(compraError.message);
  if (!compra) throw new Error("Compra no encontrada.");

  if (compra.estado === "entregada" || compra.estado === "cancelada") {
    throw new Error("No se pueden eliminar abonos en este estado.");
  }

  const { error: deleteError } = await supabase
    .from("pagos")
    .delete()
    .eq("id", pagoId);

  if (deleteError) throw new Error(deleteError.message);

  revalidateClient(userId);
  return { ok: true };
}
