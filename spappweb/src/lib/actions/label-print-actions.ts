"use server";

import { spawn } from "node:child_process";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { requireAdminSession } from "@/lib/auth/session";
import {
  buildPriceLabelZpl,
  toPriceLabelData,
} from "@/lib/printing/price-label";
import { createAdminClient } from "@/lib/supabase/admin";

/** Nombre exacto de la iF4 en Panel de control → Impresoras (solo Windows local). */
const LABEL_PRINTER_NAME = process.env.LABEL_PRINTER_NAME?.trim();

const productIdSchema = z.number().int().positive();

export type PrintPriceLabelResult =
  | { ok: true; method: "direct" }
  | { ok: true; method: "download"; zpl: string; sku: string };

async function sendZplToWindowsPrinter(zpl: string): Promise<void> {
  const printerName = LABEL_PRINTER_NAME;
  if (!printerName) {
    throw new Error("LABEL_PRINTER_NAME no configurado.");
  }

  const tmpFile = join(tmpdir(), `spapp-label-${Date.now()}.zpl`);
  const scriptPath = join(process.cwd(), "scripts", "print-zpl.ps1");

  await writeFile(tmpFile, zpl, "utf8");

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        "powershell",
        [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          scriptPath,
          "-PrinterName",
          printerName,
          "-ZplFile",
          tmpFile,
        ],
        { windowsHide: true },
      );

      let stderr = "";
      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(stderr.trim() || `PowerShell exit ${code}`));
      });
    });
  } finally {
    await unlink(tmpFile).catch(() => undefined);
  }
}

export async function printPriceLabel(
  productId: number,
  copies = 1,
): Promise<PrintPriceLabelResult> {
  await requireAdminSession();

  const parsedId = productIdSchema.parse(productId);
  const parsedCopies = Math.max(1, Math.min(copies, 99));

  const supabase = createAdminClient();
  const { data: product, error } = await supabase
    .from("inventario_productos")
    .select("id, categoria_id, sku, nombre, descripcion, precio, stock, stock_minimo, imagen_url, compatible_modelos, activo")
    .eq("id", parsedId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!product) throw new Error("Producto no encontrado.");

  const labelData = toPriceLabelData(product);
  const zpl = buildPriceLabelZpl(labelData, parsedCopies);

  if (LABEL_PRINTER_NAME && process.platform === "win32") {
    try {
      await sendZplToWindowsPrinter(zpl);
      return { ok: true, method: "direct" };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error de impresión.";
      throw new Error(
        `No se pudo imprimir en "${LABEL_PRINTER_NAME}": ${message}`,
      );
    }
  }

  return { ok: true, method: "download", zpl, sku: labelData.sku };
}
