/**
 * Genera contrato_renovacion.pdf para Johan Vergara (user 33) sin tocar el original.
 * node --import ./scripts/stub-server-only.mjs --import tsx scripts/generate-contrato-renovacion-johan.ts
 */
import { createClient } from "@supabase/supabase-js";
import {
  generateRenovacionContratoPdfForRow,
  regenerateContratoOverridesSelfCheck,
  type FirmadoContratoRow,
} from "../src/lib/contracts/regenerate-contrato-pdf";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../src/lib/supabase/public-env";

const JOHAN_CONTRACT_ID = "962ef950-adab-41cd-b0b0-86ce3caadb35";

async function main() {
  regenerateContratoOverridesSelfCheck();

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from("digital_contracts")
    .select(
      "id, user_id, signature_path, contrato_pdf_path, contrato_data, hoja_vida_data",
    )
    .eq("id", JOHAN_CONTRACT_ID)
    .eq("status", "firmado")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.signature_path) throw new Error("Contrato/firma no encontrados.");

  const result = await generateRenovacionContratoPdfForRow(
    supabase,
    data as FirmadoContratoRow,
  );
  console.log("OK renovación PDF:", result.path, "bytes:", result.pdfBytes);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
