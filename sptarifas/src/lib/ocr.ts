import sharp from "sharp";
import { createWorker } from "tesseract.js";
import { parseReceiptText, type ParsedReceipt } from "./parser";

export type OcrResult = ParsedReceipt & { rawText: string };

async function preprocess(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .grayscale()
    .normalize()
    .sharpen()
    .png()
    .toBuffer();
}

export async function ocrReceipt(buffer: Buffer): Promise<OcrResult> {
  const processed = await preprocess(buffer);
  const worker = await createWorker("spa");
  try {
    const { data } = await worker.recognize(processed);
    const rawText = data.text ?? "";
    return { ...parseReceiptText(rawText), rawText };
  } finally {
    await worker.terminate();
  }
}
