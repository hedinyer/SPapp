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

/** Opcional: forzar impresora. Si no está, usa la predeterminada de Windows. */
const LABEL_PRINTER_NAME = process.env.LABEL_PRINTER_NAME?.trim();

const productIdSchema = z.number().int().positive();
const printerNameSchema = z.string().trim().min(1).optional();

export type PrintPriceLabelResult =
  | { ok: true; method: "direct"; printerName: string }
  | { ok: true; method: "download"; zpl: string; sku: string };

function runPowerShell(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "powershell",
      ["-NoProfile", "-Command", command],
      { windowsHide: true },
    );

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `PowerShell exit ${code}`));
    });
  });
}

async function getDefaultWindowsPrinterName(): Promise<string | null> {
  const name = await runPowerShell(
    "(Get-CimInstance Win32_Printer | Where-Object { $_.Default -eq $true }).Name",
  );
  return name || null;
}

async function resolvePrinterName(
  clientPrinterName?: string,
): Promise<string | null> {
  if (LABEL_PRINTER_NAME) return LABEL_PRINTER_NAME;
  if (clientPrinterName) return clientPrinterName;
  if (process.platform !== "win32") return null;
  return getDefaultWindowsPrinterName();
}

async function sendZplToWindowsPrinter(
  zpl: string,
  printerName: string,
): Promise<void> {
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
  printerName?: string,
): Promise<PrintPriceLabelResult> {
  await requireAdminSession();

  const parsedId = productIdSchema.parse(productId);
  const parsedCopies = Math.max(1, Math.min(copies, 99));
  const parsedPrinter = printerNameSchema.parse(printerName);

  const supabase = createAdminClient();
  const { data: product, error } = await supabase
    .from("inventario_productos")
    .select(
      "id, categoria_id, sku, nombre, descripcion, precio, stock, stock_minimo, imagen_url, compatible_modelos, activo",
    )
    .eq("id", parsedId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!product) throw new Error("Producto no encontrado.");

  const labelData = toPriceLabelData(product);
  const zpl = buildPriceLabelZpl(labelData, parsedCopies);

  if (process.platform === "win32") {
    const resolvedPrinter = await resolvePrinterName(parsedPrinter);
    if (resolvedPrinter) {
      try {
        await sendZplToWindowsPrinter(zpl, resolvedPrinter);
        return { ok: true, method: "direct", printerName: resolvedPrinter };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Error de impresión.";
        throw new Error(
          `No se pudo imprimir en "${resolvedPrinter}": ${message}`,
        );
      }
    }
  }

  return { ok: true, method: "download", zpl, sku: labelData.sku };
}
