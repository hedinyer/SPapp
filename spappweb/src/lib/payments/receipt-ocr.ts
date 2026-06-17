import "server-only";

import sharp from "sharp";
import { createWorker } from "tesseract.js";
import { parseReceiptText, type ParsedReceipt } from "./receipt-parser";

export type OcrResult = ParsedReceipt & {
  rawText: string;
};

async function preprocessImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .grayscale()
    .normalize()
    .sharpen()
    .png()
    .toBuffer();
}

export async function extractTextFromReceipt(buffer: Buffer): Promise<string> {
  const processed = await preprocessImage(buffer);
  const worker = await createWorker("spa");

  try {
    const { data } = await worker.recognize(processed);
    return data.text ?? "";
  } finally {
    await worker.terminate();
  }
}

export async function ocrReceiptImage(buffer: Buffer): Promise<OcrResult> {
  const rawText = await extractTextFromReceipt(buffer);
  const parsed = parseReceiptText(rawText);

  return {
    ...parsed,
    rawText,
  };
}
