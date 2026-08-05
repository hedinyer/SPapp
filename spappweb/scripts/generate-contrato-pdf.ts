/**
 * Genera PDF de muestra del Contrato de Renting SPapp (Soluciones Garrido).
 * node --import ./scripts/stub-server-only.mjs --import tsx scripts/generate-contrato-pdf.ts [salida]
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateContratoPdf } from "../src/lib/contracts/contract-pdf";
import {
  buildContratoComercial,
  EMPRESA_PROPIETARIA,
} from "../src/lib/contracts/contrato-renting-clausulas";

async function main() {
  const outPath =
    process.argv[2] ||
    path.join(
      process.env.USERPROFILE || process.cwd(),
      "Documents",
      "contrato-renting-sapp-garrido.pdf",
    );

  const comercial = buildContratoComercial({
    modelo: "SBR 200",
    color: "Rojo",
    placa: "ABC123",
    chasis: "CHASIS-EJEMPLO-001",
    referencia: "REF-DEMO",
    frecuencia_pago: "diario",
    cuota_inicial_monto: 1_500_000,
    monto_cuota_periodo: 60_000,
  });

  const contrato = {
    nombreContratante: "CLIENTE DE EJEMPLO",
    cedulaContratante: "1234567890",
    tipoDocContratante: "C.C.",
    direccionNotificaciones: "Calle 1 #2-3",
    ciudadContratante: "Girardot",
    departamentoContratante: "Cundinamarca",
    fechaFirmaDia: "15",
    fechaFirmaMes: "julio",
    fechaFirmaAnio: "2026",
    ...comercial,
  };

  const signatureDataUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  const buf = Buffer.from(
    await generateContratoPdf({ contrato, signatureDataUrl }),
  );
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, buf);

  console.log("Empresa:", EMPRESA_PROPIETARIA.razonSocial);
  console.log("PDF:", outPath);
  console.log("Bytes:", buf.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
