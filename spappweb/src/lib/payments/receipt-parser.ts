export type BancoDetectado = "nequi" | "davivienda" | "otro" | null;

export interface ParsedReceipt {
  referencia: string | null;
  monto: number | null;
  fechaComprobante: string | null;
  bancoDetectado: BancoDetectado;
  confidence: number;
}

const MESES: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

function normalizeOcrText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\r/g, "\n")
    .replace(/[|]/g, "I");
}

function parseColombianAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,]/g, "").trim();
  if (!cleaned) return null;

  let normalized = cleaned;
  if (/,/.test(cleaned) && /\./.test(cleaned)) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (/,/.test(cleaned)) {
    const parts = cleaned.split(",");
    if (parts[1]?.length === 2) {
      normalized = parts[0].replace(/\./g, "") + "." + parts[1];
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else {
    normalized = cleaned.replace(/\./g, "");
  }

  const value = Math.round(parseFloat(normalized));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function extractReferencia(text: string): string | null {
  const patterns = [
    /referencia\s*[:\-]?\s*([A-Z]?\d{5,15})/i,
    /\b(M\d{5,12})\b/i,
    /\b([A-Z]{1,2}\d{6,12})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].toUpperCase();
  }

  return null;
}

function extractMonto(text: string): number | null {
  const cuantoPatterns = [
    /cu[aá]nto\s*\??\s*\$?\s*([\d.,\s]+)/i,
    /monto\s*[:\-]?\s*\$?\s*([\d.,\s]+)/i,
    /\$\s*([\d]{1,3}(?:[.\s]\d{3})*(?:,\d{2})?)/,
  ];

  for (const pattern of cuantoPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const parsed = parseColombianAmount(match[1]);
      if (parsed) return parsed;
    }
  }

  return null;
}

function parseSpanishDateTime(text: string): string | null {
  const dateMatch = text.match(
    /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})/i,
  );

  if (!dateMatch) return null;

  const day = parseInt(dateMatch[1], 10);
  const month = MESES[dateMatch[2].toLowerCase()];
  const year = parseInt(dateMatch[3], 10);

  if (!month || !Number.isFinite(day) || !Number.isFinite(year)) return null;

  let hours = 12;
  let minutes = 0;

  const timeMatch = text.match(
    /a\s+las\s+(\d{1,2})\s*:\s*(\d{2})\s*(a\.?\s*m\.?|p\.?\s*m\.?)/i,
  );

  if (timeMatch) {
    hours = parseInt(timeMatch[1], 10);
    minutes = parseInt(timeMatch[2], 10);
    const isPm = /p/i.test(timeMatch[3]);
    if (isPm && hours < 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const isoLocal = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00-05:00`;
  const date = new Date(isoLocal);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

function detectBanco(text: string): BancoDetectado {
  const lower = text.toLowerCase();
  if (lower.includes("nequi")) return "nequi";
  if (lower.includes("davivienda") || lower.includes("daviplata")) {
    return "davivienda";
  }
  return null;
}

export function parseReceiptText(rawText: string): ParsedReceipt {
  const text = normalizeOcrText(rawText);
  const referencia = extractReferencia(text);
  const monto = extractMonto(text);
  const fechaComprobante = parseSpanishDateTime(text);
  const bancoDetectado = detectBanco(text);

  let confidence = 0;
  if (referencia) confidence += 1;
  if (monto) confidence += 1;
  if (fechaComprobante) confidence += 1;

  return {
    referencia,
    monto,
    fechaComprobante,
    bancoDetectado,
    confidence,
  };
}
