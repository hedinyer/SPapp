"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminSession } from "@/lib/auth/session";
import {
  regenerateContratoPdfForRow,
  type FirmadoContratoRow,
} from "@/lib/contracts/regenerate-contrato-pdf";
import { createAdminClient } from "@/lib/supabase/admin";
import { getContractPublicUrl } from "@/lib/utils/storage-urls";
import type { FrecuenciaPago } from "@/lib/pipeline/types";

function revalidateClient(userId: number) {
  revalidatePath("/inbox");
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${userId}`);
}

async function assertAdmin() {
  await requireAdminSession();
  return createAdminClient();
}

const FREQ = z.enum(["diario", "semanal", "quincenal", "mensual"]);

export async function getContractDetail(contractId: string) {
  const parsed = z.string().uuid().parse(contractId);
  const supabase = await assertAdmin();

  const { data, error } = await supabase
    .from("digital_contracts")
    .select(
      "id, user_id, users_documents_id, status, hoja_vida_data, contrato_data, admin_data, signature_path, hoja_vida_pdf_path, contrato_pdf_path, signed_at, created_at, updated_at",
    )
    .eq("id", parsed)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Contrato no encontrado.");

  const bust = data.updated_at ?? data.signed_at;
  return {
    ...data,
    urls: {
      contratoPdf: getContractPublicUrl(data.contrato_pdf_path, bust),
      hojaVidaPdf: getContractPublicUrl(data.hoja_vida_pdf_path, bust),
      signature: getContractPublicUrl(data.signature_path, bust),
    },
    overrides: {
      duracion_texto: (data.contrato_data as Record<string, unknown>)
        ?.duracion_texto,
      num_periodos: (data.contrato_data as Record<string, unknown>)
        ?.num_periodos,
      total_contrato: (data.contrato_data as Record<string, unknown>)
        ?.total_contrato,
    },
  };
}

const updateTermsSchema = z.object({
  contractId: z.string().uuid(),
  userId: z.number().int().positive(),
  duracionTexto: z.string().trim().min(1).optional(),
  numPeriodos: z.number().int().positive().max(2000).optional(),
  totalContrato: z.string().trim().min(1).optional(),
  motoPlaca: z.string().trim().optional(),
  motoChasis: z.string().trim().optional(),
  motoModelo: z.string().trim().optional(),
  motoColor: z.string().trim().optional(),
  frecuenciaPago: FREQ.optional(),
  cuotaInicial: z.number().int().min(0).optional(),
  valorCuota: z.number().int().positive().optional(),
  /** Si true y el contrato está firmado, regenera el PDF tras guardar. */
  regeneratePdf: z.boolean().optional(),
});

export async function updateContractTerms(
  input: z.infer<typeof updateTermsSchema>,
) {
  const parsed = updateTermsSchema.parse(input);
  const supabase = await assertAdmin();

  const { data: row, error } = await supabase
    .from("digital_contracts")
    .select(
      "id, user_id, status, contrato_data, admin_data, signature_path, contrato_pdf_path, hoja_vida_data",
    )
    .eq("id", parsed.contractId)
    .eq("user_id", parsed.userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) throw new Error("Contrato no encontrado.");

  const cd = {
    ...((row.contrato_data as Record<string, unknown>) ?? {}),
  };
  const admin = {
    ...((row.admin_data as Record<string, unknown>) ?? {}),
  };

  if (parsed.duracionTexto != null) cd.duracion_texto = parsed.duracionTexto;
  if (parsed.numPeriodos != null) cd.num_periodos = parsed.numPeriodos;
  if (parsed.totalContrato != null) cd.total_contrato = parsed.totalContrato;
  if (parsed.motoPlaca != null) {
    const placa = parsed.motoPlaca.toUpperCase();
    cd.moto_placa = placa;
    admin.placa = placa;
  }
  if (parsed.motoChasis != null) {
    cd.moto_chasis = parsed.motoChasis;
    admin.chasis = parsed.motoChasis;
  }
  if (parsed.motoModelo != null) {
    cd.moto_modelo = parsed.motoModelo;
    admin.moto_modelo = parsed.motoModelo;
  }
  if (parsed.motoColor != null) {
    cd.moto_color = parsed.motoColor;
    admin.moto_color = parsed.motoColor;
  }
  if (parsed.frecuenciaPago != null) {
    cd.frecuencia_pago = parsed.frecuenciaPago;
    admin.frecuencia_pago = parsed.frecuenciaPago;
  }
  if (parsed.cuotaInicial != null) {
    cd.cuota_inicial = parsed.cuotaInicial;
    admin.cuota_inicial = parsed.cuotaInicial;
  }
  if (parsed.valorCuota != null) {
    cd.valor_cuota = parsed.valorCuota;
    admin.valor_cuota = parsed.valorCuota;
  }

  const { error: updErr } = await supabase
    .from("digital_contracts")
    .update({ contrato_data: cd, admin_data: admin })
    .eq("id", parsed.contractId);
  if (updErr) throw new Error(updErr.message);

  // Sync compra si hay campos de moto/montos
  const compraPatch: Record<string, unknown> = {};
  if (parsed.motoPlaca != null) compraPatch.placa = parsed.motoPlaca.toUpperCase();
  if (parsed.motoChasis != null) compraPatch.chasis = parsed.motoChasis;
  if (parsed.motoModelo != null) compraPatch.modelo = parsed.motoModelo;
  if (parsed.motoColor != null) compraPatch.color = parsed.motoColor;
  if (parsed.frecuenciaPago != null) {
    compraPatch.frecuencia_pago = parsed.frecuenciaPago;
  }
  if (parsed.cuotaInicial != null) {
    compraPatch.cuota_inicial_monto = parsed.cuotaInicial;
  }
  if (parsed.valorCuota != null) {
    compraPatch.monto_cuota_periodo = parsed.valorCuota;
  }

  if (Object.keys(compraPatch).length > 0) {
    const { data: compra } = await supabase
      .from("user_moto_compra")
      .select("id, estado")
      .eq("user_id", parsed.userId)
      .maybeSingle();
    if (compra && compra.estado === "pendiente_pago") {
      await supabase
        .from("user_moto_compra")
        .update(compraPatch)
        .eq("id", compra.id);
    }
  }

  let regen: Awaited<ReturnType<typeof regenerateContratoPdfForRow>> | null =
    null;
  if (parsed.regeneratePdf) {
    if (row.status !== "firmado") {
      throw new Error("Solo se puede regenerar el PDF de un contrato firmado.");
    }
    if (!row.signature_path || !row.contrato_pdf_path) {
      throw new Error("El contrato no tiene firma o PDF para regenerar.");
    }
    regen = await regenerateContratoPdfForRow(supabase, {
      id: row.id,
      user_id: row.user_id,
      signature_path: row.signature_path,
      contrato_pdf_path: row.contrato_pdf_path,
      contrato_data: cd,
      hoja_vida_data: (row.hoja_vida_data as Record<string, unknown>) ?? null,
    } satisfies FirmadoContratoRow);
  }

  revalidateClient(parsed.userId);
  return { ok: true as const, contratoData: cd, regenerate: regen };
}

export async function syncContractFromCompra(input: {
  contractId: string;
  userId: number;
  regeneratePdf?: boolean;
}) {
  const parsed = z
    .object({
      contractId: z.string().uuid(),
      userId: z.number().int().positive(),
      regeneratePdf: z.boolean().optional(),
    })
    .parse(input);
  const supabase = await assertAdmin();

  const { data: compra, error: compraErr } = await supabase
    .from("user_moto_compra")
    .select(
      "id, modelo, color, placa, chasis, referencia, frecuencia_pago, cuota_inicial_monto, monto_cuota_periodo, monto_total_primer_pago, estado, pago_inicial_confirmado, pago_cuota_confirmado",
    )
    .eq("user_id", parsed.userId)
    .maybeSingle();

  if (compraErr) throw new Error(compraErr.message);
  if (!compra) throw new Error("No hay compra de moto para este cliente.");

  const { data: row, error } = await supabase
    .from("digital_contracts")
    .select(
      "id, user_id, status, contrato_data, admin_data, signature_path, contrato_pdf_path, hoja_vida_data",
    )
    .eq("id", parsed.contractId)
    .eq("user_id", parsed.userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) throw new Error("Contrato no encontrado.");

  const motoAdmin = {
    moto_modelo: compra.modelo,
    moto_color: compra.color,
    frecuencia_pago: compra.frecuencia_pago,
    cuota_inicial: compra.cuota_inicial_monto,
    valor_cuota: compra.monto_cuota_periodo,
    monto_total_primer_pago: compra.monto_total_primer_pago,
    placa: compra.placa,
    chasis: compra.chasis,
    referencia: compra.referencia,
    compra_estado: compra.estado,
    pago_inicial_confirmado: compra.pago_inicial_confirmado,
    pago_cuota_confirmado: compra.pago_cuota_confirmado,
  };

  const cd = {
    ...((row.contrato_data as Record<string, unknown>) ?? {}),
    moto_modelo: compra.modelo,
    moto_color: compra.color,
    moto_placa: compra.placa,
    moto_chasis: compra.chasis,
    frecuencia_pago: compra.frecuencia_pago as FrecuenciaPago,
    cuota_inicial: compra.cuota_inicial_monto,
    valor_cuota: compra.monto_cuota_periodo,
  };

  const admin = {
    ...((row.admin_data as Record<string, unknown>) ?? {}),
    ...motoAdmin,
  };

  const { error: updErr } = await supabase
    .from("digital_contracts")
    .update({ contrato_data: cd, admin_data: admin })
    .eq("id", parsed.contractId);
  if (updErr) throw new Error(updErr.message);

  let regen: Awaited<ReturnType<typeof regenerateContratoPdfForRow>> | null =
    null;
  if (parsed.regeneratePdf) {
    if (row.status !== "firmado" || !row.signature_path || !row.contrato_pdf_path) {
      throw new Error("No se puede regenerar: falta firma/PDF o no está firmado.");
    }
    regen = await regenerateContratoPdfForRow(supabase, {
      id: row.id,
      user_id: row.user_id,
      signature_path: row.signature_path,
      contrato_pdf_path: row.contrato_pdf_path,
      contrato_data: cd,
      hoja_vida_data: (row.hoja_vida_data as Record<string, unknown>) ?? null,
    });
  }

  revalidateClient(parsed.userId);
  return { ok: true as const, contratoData: cd, adminData: admin, regenerate: regen };
}

export async function regenerateContractPdf(input: {
  contractId: string;
  userId?: number;
}) {
  const parsed = z
    .object({
      contractId: z.string().uuid(),
      userId: z.number().int().positive().optional(),
    })
    .parse(input);
  const supabase = await assertAdmin();

  let query = supabase
    .from("digital_contracts")
    .select(
      "id, user_id, status, signature_path, contrato_pdf_path, contrato_data, hoja_vida_data",
    )
    .eq("id", parsed.contractId)
    .eq("status", "firmado");
  if (parsed.userId != null) query = query.eq("user_id", parsed.userId);

  const { data: row, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Contrato firmado no encontrado.");
  if (!row.signature_path || !row.contrato_pdf_path) {
    throw new Error("El contrato no tiene firma o ruta de PDF.");
  }

  const result = await regenerateContratoPdfForRow(supabase, {
    id: row.id,
    user_id: row.user_id,
    signature_path: row.signature_path,
    contrato_pdf_path: row.contrato_pdf_path,
    contrato_data: (row.contrato_data as Record<string, unknown>) ?? {},
    hoja_vida_data: (row.hoja_vida_data as Record<string, unknown>) ?? null,
  });

  revalidateClient(row.user_id);
  return result;
}

const updateCompraMontosSchema = z.object({
  userId: z.number().int().positive(),
  compraId: z.string().uuid(),
  cuotaInicial: z.number().int().min(0).optional(),
  montoCuotaPeriodo: z.number().int().positive().optional(),
});

/** Ajusta montos de compra solo en pendiente_pago; sincroniza admin_data del contrato. */
export async function updateCompraMontos(
  input: z.infer<typeof updateCompraMontosSchema>,
) {
  const parsed = updateCompraMontosSchema.parse(input);
  if (parsed.cuotaInicial == null && parsed.montoCuotaPeriodo == null) {
    throw new Error("Indica cuotaInicial y/o montoCuotaPeriodo.");
  }
  const supabase = await assertAdmin();

  const { data: compra, error } = await supabase
    .from("user_moto_compra")
    .select(
      "id, user_id, estado, digital_contract_id, cuota_inicial_monto, monto_cuota_periodo, monto_visita_monto, frecuencia_pago",
    )
    .eq("id", parsed.compraId)
    .eq("user_id", parsed.userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!compra) throw new Error("Compra no encontrada.");
  if (compra.estado !== "pendiente_pago") {
    throw new Error("Solo se pueden editar montos con pago pendiente.");
  }

  const cuotaInicial = parsed.cuotaInicial ?? compra.cuota_inicial_monto;
  const montoCuota =
    parsed.montoCuotaPeriodo ?? compra.monto_cuota_periodo;
  const montoVisita = Number(compra.monto_visita_monto ?? 0);
  const montoTotal = cuotaInicial + montoCuota + montoVisita;

  const { error: updErr } = await supabase
    .from("user_moto_compra")
    .update({
      cuota_inicial_monto: cuotaInicial,
      monto_cuota_periodo: montoCuota,
      monto_total_primer_pago: montoTotal,
    })
    .eq("id", compra.id);
  if (updErr) throw new Error(updErr.message);

  if (compra.digital_contract_id) {
    const { data: contract } = await supabase
      .from("digital_contracts")
      .select("id, contrato_data, admin_data")
      .eq("id", compra.digital_contract_id)
      .maybeSingle();
    if (contract) {
      const cd = {
        ...((contract.contrato_data as Record<string, unknown>) ?? {}),
        cuota_inicial: cuotaInicial,
        valor_cuota: montoCuota,
      };
      const admin = {
        ...((contract.admin_data as Record<string, unknown>) ?? {}),
        cuota_inicial: cuotaInicial,
        valor_cuota: montoCuota,
        monto_total_primer_pago: montoTotal,
      };
      await supabase
        .from("digital_contracts")
        .update({ contrato_data: cd, admin_data: admin })
        .eq("id", contract.id);
    }
  }

  revalidateClient(parsed.userId);
  return {
    ok: true as const,
    cuotaInicial,
    montoCuotaPeriodo: montoCuota,
    montoTotalPrimerPago: montoTotal,
  };
}

const updateTarifaSchema = z.object({
  tarifaId: z.string().uuid(),
  userId: z.number().int().positive(),
  montoEsperado: z.number().int().positive().optional(),
  fechaVencimiento: z.string().min(1).optional(),
});

/** Edita monto/fecha de una tarifa pendiente o vencida (no pagada). */
export async function updateTarifa(input: z.infer<typeof updateTarifaSchema>) {
  const parsed = updateTarifaSchema.parse(input);
  if (parsed.montoEsperado == null && parsed.fechaVencimiento == null) {
    throw new Error("Indica montoEsperado y/o fechaVencimiento.");
  }
  const supabase = await assertAdmin();

  const { data: tarifa, error } = await supabase
    .from("tarifas_pagadas")
    .select("id, user_id, estado, monto_esperado, fecha_vencimiento")
    .eq("id", parsed.tarifaId)
    .eq("user_id", parsed.userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!tarifa) throw new Error("Tarifa no encontrada.");
  if (tarifa.estado === "pagada") {
    throw new Error("No se puede editar una tarifa ya pagada.");
  }

  const patch: Record<string, unknown> = {};
  if (parsed.montoEsperado != null) patch.monto_esperado = parsed.montoEsperado;
  if (parsed.fechaVencimiento != null) {
    patch.fecha_vencimiento = parsed.fechaVencimiento;
  }

  const { error: updErr } = await supabase
    .from("tarifas_pagadas")
    .update(patch)
    .eq("id", parsed.tarifaId);
  if (updErr) throw new Error(updErr.message);

  revalidateClient(parsed.userId);
  return { ok: true as const, ...patch };
}
