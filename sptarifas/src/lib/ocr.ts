import sharp from "sharp";
import { createWorker, type Worker } from "tesseract.js";
import { parseReceiptText, type ParsedReceipt } from "./parser";

export type OcrResult = ParsedReceipt & { rawText: string };

declare global {
  // eslint-disable-next-line no-var
  var _ocrWorker: Promise<Worker> | undefined;
}

function getWorker(): Promise<Worker> {
  // El worker (WASM + datos del idioma) se carga una sola vez y se reutiliza.
  if (!global._ocrWorker) {
    global._ocrWorker = createWorker("spa");
  }
  return global._ocrWorker;
}

// ponytail: un solo worker compartido -> serializar peticiones evita choques.
// Si el volumen sube, levantar un pool de workers.
let chain: Promise<unknown> = Promise.resolve();
function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
}

async function preprocess(buffer: Buffer): Promise<Buffer> {
  // Imagen mas pequena = OCR mucho mas rapido (el tiempo escala con el area).
  return sharp(buffer)
    .rotate()
    .resize({ width: 1100, height: 1100, fit: "inside", withoutEnlargement: true })
    .grayscale()
    .normalize()
    .jpeg({ quality: 80 })
    .toBuffer();
}

export async function ocrReceipt(buffer: Buffer): Promise<OcrResult> {
  const processed = await preprocess(buffer);
  const worker = await getWorker();
  const { data } = await runExclusive(() => worker.recognize(processed));
  const rawText = data.text ?? "";
  return { ...parseReceiptText(rawText), rawText };
}

// Pre-carga el worker al importar el modulo (la primera lectura ya no espera la init).
void getWorker();
