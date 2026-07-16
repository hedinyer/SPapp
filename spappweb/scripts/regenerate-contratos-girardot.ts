/**
 * Regenera contrato.pdf de contratos firmados (solo cambia ubicación a Girardot).
 * node --import ./scripts/stub-server-only.mjs --import tsx scripts/regenerate-contratos-girardot.ts [contract-id]
 */
import { createClient } from "@supabase/supabase-js";
import { generateContratoPdf } from "../src/lib/contracts/contract-pdf";
import {
  buildContratoComercial,
  type ContratoData,
} from "../src/lib/contracts/contrato-renting-clausulas";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../src/lib/supabase/public-env";
import type { FrecuenciaPago } from "../src/lib/pipeline/types";

const BUCKET = "contract-documents";

type ContratoRow = {
  id: string;
  user_id: number;
  signature_path: string;
  contrato_pdf_path: string;
  contrato_data: Record<string, unknown>;
};

async function main() {
  const onlyId = process.argv[2]?.trim() || null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let query = supabase
    .from("digital_contracts")
    .select("id, user_id, signature_path, contrato_pdf_path, contrato_data")
    .eq("status", "firmado")
    .not("contrato_pdf_path", "is", null)
    .not("signature_path", "is", null);
  if (onlyId) query = query.eq("id", onlyId);

  const { data: contracts, error } = await query;

  if (error) throw new Error(error.message);
  if (!contracts?.length) {
    console.log("No hay contratos firmados.");
    return;
  }

  let ok = 0;
  for (const row of contracts as ContratoRow[]) {
    const cd = row.contrato_data ?? {};
    const freq = String(cd.frecuencia_pago ?? "diario") as FrecuenciaPago;
    const cuotaInicial = Number(cd.cuota_inicial ?? 0);
    const valorCuota = Number(cd.valor_cuota ?? 0);

    const { data: compra } = await supabase
      .from("user_moto_compra")
      .select("referencia")
      .eq("user_id", row.user_id)
      .maybeSingle();

    const comercial = buildContratoComercial({
      modelo: String(cd.moto_modelo ?? ""),
      color: String(cd.moto_color ?? ""),
      placa: String(cd.moto_placa ?? ""),
      chasis: String(cd.moto_chasis ?? ""),
      referencia: (compra?.referencia as string | null) ?? null,
      frecuencia_pago: freq,
      cuota_inicial_monto: cuotaInicial,
      monto_cuota_periodo: valorCuota,
    });

    // Si había total formateado guardado, conservar el mismo texto comercial guardado
    if (typeof cd.total_contrato === "string" && cd.total_contrato.trim()) {
      comercial.totalContrato = cd.total_contrato;
    }

    const contrato: ContratoData = {
      nombreContratante: String(cd.nombre_contratante ?? ""),
      cedulaContratante: String(cd.cedula_contratante ?? ""),
      direccionNotificaciones: String(cd.direccion_notificaciones ?? ""),
      ciudadContratante: String(cd.ciudad_contratante ?? ""),
      departamentoContratante: String(cd.departamento_contratante ?? ""),
      fechaFirmaDia: String(cd.fecha_firma_dia ?? ""),
      fechaFirmaMes: String(cd.fecha_firma_mes ?? ""),
      fechaFirmaAnio: String(cd.fecha_firma_anio ?? ""),
      ...comercial,
    };

    const { data: sigBlob, error: sigErr } = await supabase.storage
      .from(BUCKET)
      .download(row.signature_path);
    if (sigErr || !sigBlob) {
      console.error("FAIL signature", row.id, sigErr?.message);
      continue;
    }
    const sigBuf = Buffer.from(await sigBlob.arrayBuffer());
    const signatureDataUrl = `data:image/png;base64,${sigBuf.toString("base64")}`;

    const pdf = Buffer.from(
      await generateContratoPdf({ contrato, signatureDataUrl }),
    );

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(row.contrato_pdf_path, pdf, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (upErr) {
      console.error("FAIL upload", row.id, upErr.message);
      continue;
    }

    ok += 1;
    console.log(
      "OK",
      row.user_id,
      cd.nombre_contratante,
      cd.moto_placa,
      pdf.length,
    );
  }

  console.log(`Hecho: ${ok}/${contracts.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
