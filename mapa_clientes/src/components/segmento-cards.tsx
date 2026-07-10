"use client";

import { SEGMENTO_COLORS, parseSegmentos } from "@/lib/types";

type Props = {
  counts: Record<string, number>;
};

const LABELS: Record<string, string> = {
  alto_valor: "Alto valor",
  en_mora: "En mora",
  nuevo: "Nuevo",
  zona_caliente: "Zona caliente",
  recuperacion: "Recuperación",
  general: "General",
};

export function SegmentoCards({ counts }: Props) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([seg, count]) => (
        <div
          key={seg}
          className="animate-in fade-in slide-in-from-bottom-2 rounded-lg border border-border bg-card/80 px-3 py-2 text-xs duration-300"
          style={{ borderLeftColor: SEGMENTO_COLORS[seg], borderLeftWidth: 3 }}
        >
          <span className="font-medium" style={{ color: SEGMENTO_COLORS[seg] }}>
            {LABELS[seg] ?? seg}
          </span>
          <span className="ml-2 tabular-nums text-muted-foreground">
            {count}
          </span>
        </div>
      ))}
    </div>
  );
}

export function countSegmentos(
  features: { properties: { segmento?: string } }[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const f of features) {
    for (const s of parseSegmentos(f.properties.segmento)) {
      counts[s] = (counts[s] ?? 0) + 1;
    }
  }
  return counts;
}
