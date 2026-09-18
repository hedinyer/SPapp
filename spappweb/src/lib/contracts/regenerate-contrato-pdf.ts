import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildContratoComercial,
  buildFormaPagoSaldoText,
  colombiaDateParts,
  type ContratoData,
} from "./contrato-renting-clausulas";
import { etiquetaDocCorta } from "./hoja-vida-schema";
import { formatCop } from "../utils/format-cop";
import type { FrecuenciaPago } from "../pipeline/types";

export const CONTRACT_DOCUMENTS_BUCKET = "contract-documents";

export type FirmadoContratoRow = {
  id: string;
  user_id: number;
  signature_path: string;
  contrato_pdf_path: string;
  contrato_data: Record<string, unknown>;
  hoja_vida_data: Record<string, unknown> | null;
};

/** Construye ContratoData honrando overrides en contrato_data. */
export function buildContratoDataFromStored(args: {
  contratoData: Record<string, unknown>;
  hojaVidaData: Record<string, unknown> | null;
  referencia: string | null;
}): ContratoData {
  const cd = args.contratoData;
  const hoja = args.hojaVidaData ?? {};
  const freq = String(cd.frecuencia_pago ?? "diario") as FrecuenciaPago;
  const cuotaInicial = Number(cd.cuota_inicial ?? 0);
  const valorCuota = Number(cd.valor_cuota ?? 0);
  const numPeriodos =
    cd.num_periodos != null && Number(cd.num_periodos) > 0
      ? Number(cd.num_periodos)
      : null;

  const comercial = buildContratoComercial({
    modelo: String(cd.moto_modelo ?? ""),
    color: String(cd.moto_color ?? ""),
    placa: String(cd.moto_placa ?? ""),
    chasis: String(cd.moto_chasis ?? ""),
    referencia: args.referencia,
    frecuencia_pago: freq,
    cuota_inicial_monto: cuotaInicial,
    monto_cuota_periodo: valorCuota,
  });

  if (numPeriodos != null) {
    comercial.formaPagoSaldo = buildFormaPagoSaldoText(
      freq,
      comercial.valorCuota,
      numPeriodos,
    );
    comercial.totalContrato = formatCop(cuotaInicial + valorCuota * numPeriodos);
  }

  if (typeof cd.total_contrato === "string" && cd.total_contrato.trim()) {
    comercial.totalContrato = cd.total_contrato;
  }

  if (typeof cd.duracion_texto === "string" && cd.duracion_texto.trim()) {
    comercial.duracionTexto = cd.duracion_texto;
  }

  const tipoDocContratante = etiquetaDocCorta(
    (typeof hoja.tipo_identificacion === "string"
      ? hoja.tipo_identificacion
      : null) ??
      (typeof cd.tipo_doc_contratante === "string"
        ? cd.tipo_doc_contratante
        : null),
  );

  const celularContratante = String(
    cd.celular_contratante ?? hoja.celular ?? "",
  ).trim();

  return {
    nombreContratante: String(cd.nombre_contratante ?? ""),
    cedulaContratante: String(cd.cedula_contratante ?? ""),
    tipoDocContratante,
    celularContratante,
    direccionNotificaciones: String(cd.direccion_notificaciones ?? ""),
    ciudadContratante: String(cd.ciudad_contratante ?? ""),
    departamentoContratante: String(cd.departamento_contratante ?? ""),
    fechaFirmaDia: String(cd.fecha_firma_dia ?? ""),
    fechaFirmaMes: String(cd.fecha_firma_mes ?? ""),
    fechaFirmaAnio: String(cd.fecha_firma_anio ?? ""),
    ...comercial,
  };
}

export type RegenerateContratoResult = {
  contractId: string;
  userId: number;
  pdfBytes: number;
  duracionTexto: string;
  totalContrato: string;
  patchedContratoData: boolean;
};

/**
 * Regenera contrato.pdf de un contrato firmado (misma firma en Storage).
 * Honra overrides: duracion_texto, num_periodos, total_contrato.
 */
export async function regenerateContratoPdfForRow(
  supabase: SupabaseClient,
  row: FirmadoContratoRow,
): Promise<RegenerateContratoResult> {
  const cd = row.contrato_data ?? {};
  const hoja = row.hoja_vida_data;

  const { data: compra } = await supabase
    .from("user_moto_compra")
    .select("referencia")
    .eq("user_id", row.user_id)
    .maybeSingle();

  const contrato = buildContratoDataFromStored({
    contratoData: cd,
    hojaVidaData: hoja,
    referencia: (compra?.referencia as string | null) ?? null,
  });

  const { data: sigBlob, error: sigErr } = await supabase.storage
    .from(CONTRACT_DOCUMENTS_BUCKET)
    .download(row.signature_path);
  if (sigErr || !sigBlob) {
    throw new Error(
      `No se pudo descargar la firma: ${sigErr?.message ?? "vacío"}`,
    );
  }

  const sigBuf = Buffer.from(await sigBlob.arrayBuffer());
  const signatureDataUrl = `data:image/png;base64,${sigBuf.toString("base64")}`;
  // Dynamic: evita cargar @react-pdf / server-only en self-checks de overrides.
  const { generateContratoPdf } = await import("./contract-pdf");
  const pdf = Buffer.from(
    await generateContratoPdf({ contrato, signatureDataUrl }),
  );

  const { error: upErr } = await supabase.storage
    .from(CONTRACT_DOCUMENTS_BUCKET)
    .upload(row.contrato_pdf_path, pdf, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (upErr) throw new Error(`No se pudo subir el PDF: ${upErr.message}`);

  let patchedContratoData = false;
  if (
    cd.tipo_doc_contratante !== contrato.tipoDocContratante ||
    cd.celular_contratante !== contrato.celularContratante
  ) {
    const { error: patchErr } = await supabase
      .from("digital_contracts")
      .update({
        contrato_data: {
          ...cd,
          tipo_doc_contratante: contrato.tipoDocContratante,
          celular_contratante: contrato.celularContratante,
        },
      })
      .eq("id", row.id);
    if (patchErr) throw new Error(patchErr.message);
    patchedContratoData = true;
  }

  return {
    contractId: row.id,
    userId: row.user_id,
    pdfBytes: pdf.length,
    duracionTexto: contrato.duracionTexto,
    totalContrato: contrato.totalContrato,
    patchedContratoData,
  };
}

/**
 * Genera contrato_renovacion.pdf sin tocar el PDF original.
 * Usa fecha de firma = hoy (Colombia) y overrides de renovación en contrato_data.
 */
export async function generateRenovacionContratoPdfForRow(
  supabase: SupabaseClient,
  row: FirmadoContratoRow,
): Promise<{ path: string; pdfBytes: number }> {
  const cd = { ...(row.contrato_data ?? {}) };
  const renovPath =
    typeof cd.contrato_renovacion_pdf_path === "string" &&
    cd.contrato_renovacion_pdf_path.trim()
      ? cd.contrato_renovacion_pdf_path.trim()
      : `${row.user_id}/${row.id}/contrato_renovacion.pdf`;

  const fecha = colombiaDateParts();
  const renderCd: Record<string, unknown> = {
    ...cd,
    fecha_firma_dia: fecha.dia,
    fecha_firma_mes: fecha.mes,
    fecha_firma_anio: fecha.anio,
  };

  const { data: compra } = await supabase
    .from("user_moto_compra")
    .select("referencia")
    .eq("user_id", row.user_id)
    .maybeSingle();

  const contrato = buildContratoDataFromStored({
    contratoData: renderCd,
    hojaVidaData: row.hoja_vida_data,
    referencia: (compra?.referencia as string | null) ?? null,
  });

  const { data: sigBlob, error: sigErr } = await supabase.storage
    .from(CONTRACT_DOCUMENTS_BUCKET)
    .download(row.signature_path);
  if (sigErr || !sigBlob) {
    throw new Error(
      `No se pudo descargar la firma: ${sigErr?.message ?? "vacío"}`,
    );
  }

  const sigBuf = Buffer.from(await sigBlob.arrayBuffer());
  const signatureDataUrl = `data:image/png;base64,${sigBuf.toString("base64")}`;
  const { generateContratoPdf } = await import("./contract-pdf");
  const pdf = Buffer.from(
    await generateContratoPdf({ contrato, signatureDataUrl }),
  );

  const { error: upErr } = await supabase.storage
    .from(CONTRACT_DOCUMENTS_BUCKET)
    .upload(renovPath, pdf, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (upErr) throw new Error(`No se pudo subir PDF renovación: ${upErr.message}`);

  if (cd.contrato_renovacion_pdf_path !== renovPath) {
    const { error: patchErr } = await supabase
      .from("digital_contracts")
      .update({
        contrato_data: { ...cd, contrato_renovacion_pdf_path: renovPath },
      })
      .eq("id", row.id);
    if (patchErr) throw new Error(patchErr.message);
  }

  return { path: renovPath, pdfBytes: pdf.length };
}

/** Self-check: overrides de duración/periodos alteran el texto comercial. */
export function regenerateContratoOverridesSelfCheck(): void {
  const base = buildContratoDataFromStored({
    contratoData: {
      frecuencia_pago: "diario",
      cuota_inicial: 500_000,
      valor_cuota: 25_000,
      moto_modelo: "X",
      moto_color: "rojo",
      moto_placa: "ABC123",
      moto_chasis: "CH1",
      nombre_contratante: "Test",
      cedula_contratante: "123",
    },
    hojaVidaData: null,
    referencia: null,
  });
  if (base.duracionTexto !== "doce (12) meses") {
    throw new Error(`duración default inesperada: ${base.duracionTexto}`);
  }

  const overridden = buildContratoDataFromStored({
    contratoData: {
      frecuencia_pago: "mensual",
      cuota_inicial: 500_000,
      valor_cuota: 200_000,
      num_periodos: 6,
      duracion_texto: "seis (6) meses",
      total_contrato: "$1.700.000",
      moto_modelo: "X",
      moto_color: "rojo",
      moto_placa: "ABC123",
      moto_chasis: "CH1",
      nombre_contratante: "Test",
      cedula_contratante: "123",
    },
    hojaVidaData: null,
    referencia: null,
  });
  if (overridden.duracionTexto !== "seis (6) meses") {
    throw new Error(`override duración falló: ${overridden.duracionTexto}`);
  }
  if (overridden.totalContrato !== "$1.700.000") {
    throw new Error(`override total falló: ${overridden.totalContrato}`);
  }
  if (!overridden.formaPagoSaldo.includes("6 cuotas")) {
    throw new Error(`num_periodos no aplicado: ${overridden.formaPagoSaldo}`);
  }

  const renov = buildContratoDataFromStored({
    contratoData: {
      frecuencia_pago: "diario",
      cuota_inicial: 1_500_000,
      valor_cuota: 60_000,
      num_periodos: 330,
      duracion_texto: "trescientos treinta (330) días",
      total_contrato: "$ 21.300.000",
      moto_modelo: "BERA GBR 200",
      moto_color: "BLANCO",
      moto_placa: "DKB08I",
      moto_chasis: "00242",
      nombre_contratante: "Johan vergara",
      cedula_contratante: "1069178527",
    },
    hojaVidaData: null,
    referencia: null,
  });
  if (renov.duracionTexto !== "trescientos treinta (330) días") {
    throw new Error(`renovación duración: ${renov.duracionTexto}`);
  }
  if (!renov.formaPagoSaldo.includes("330 cuotas")) {
    throw new Error(`renovación periodos: ${renov.formaPagoSaldo}`);
  }
}
