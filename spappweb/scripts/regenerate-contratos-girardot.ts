/**
 * Regenera contrato.pdf de contratos firmados.
 * Honra overrides en contrato_data: duracion_texto, num_periodos, total_contrato.
 * node --import ./scripts/stub-server-only.mjs --import tsx scripts/regenerate-contratos-girardot.ts [contract-id]
 */
import { createClient } from "@supabase/supabase-js";
import {
  regenerateContratoPdfForRow,
  type FirmadoContratoRow,
} from "../src/lib/contracts/regenerate-contrato-pdf";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../src/lib/supabase/public-env";

async function main() {
  const onlyId = process.argv[2]?.trim() || null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let query = supabase
    .from("digital_contracts")
    .select(
      "id, user_id, signature_path, contrato_pdf_path, contrato_data, hoja_vida_data",
    )
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
  for (const row of contracts as FirmadoContratoRow[]) {
    try {
      const result = await regenerateContratoPdfForRow(supabase, row);
      ok += 1;
      console.log(
        "OK",
        result.userId,
        result.contractId,
        result.duracionTexto,
        result.totalContrato,
        result.pdfBytes,
      );
    } catch (e) {
      console.error("FAIL", row.id, e instanceof Error ? e.message : e);
    }
  }

  console.log(`Hecho: ${ok}/${contracts.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
