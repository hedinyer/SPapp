"use client";

import { formatCop } from "@/lib/utils";
import type { ClienteFeature } from "@/lib/types";
import { SEGMENTO_COLORS, parseSegmentos } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

type Props = {
  selected: ClienteFeature[];
  onClear: () => void;
};

function pct(n: number, total: number): string {
  if (!total) return "0%";
  return `${Math.round((n / total) * 100)}%`;
}

export function LassoPanel({ selected, onClear }: Props) {
  const total = selected.length;
  const tarifas = selected
    .map((f) => f.properties.tarifa)
    .filter((t): t is number => t != null && t > 0);
  const tarifaProm =
    tarifas.length > 0
      ? tarifas.reduce((a, b) => a + b, 0) / tarifas.length
      : null;

  const enMora = selected.filter(
    (f) =>
      (f.properties.mora_dias ?? 0) > 0 ||
      (f.properties.facturas_pendientes ?? 0) > 0 ||
      parseSegmentos(f.properties.segmento).includes("en_mora"),
  ).length;

  const quintiles = selected
    .map((f) => f.properties.quintil_ingreso_muni)
    .filter((q): q is number => q != null);
  const quintilMin = quintiles.length ? Math.min(...quintiles) : null;
  const quintilMax = quintiles.length ? Math.max(...quintiles) : null;

  const barrios: Record<string, number> = {};
  for (const f of selected) {
    const b = f.properties.barrio_osm || f.properties.municipio_nombre || "—";
    barrios[b] = (barrios[b] ?? 0) + 1;
  }
  const topBarrios = Object.entries(barrios)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const segmentoCounts: Record<string, number> = {};
  for (const f of selected) {
    for (const s of parseSegmentos(f.properties.segmento)) {
      segmentoCounts[s] = (segmentoCounts[s] ?? 0) + 1;
    }
  }

  function exportCsv() {
    const headers = [
      "cedula",
      "nombre",
      "telefono",
      "direccion",
      "tarifa",
      "segmento",
      "mora_dias",
      "barrio",
      "municipio",
    ];
    const rows = selected.map((f) => {
      const p = f.properties;
      return [
        p.cedula,
        p.nombre ?? "",
        p.telefono ?? "",
        p.direccion ?? "",
        p.tarifa ?? "",
        p.segmento ?? "",
        p.mora_dias ?? "",
        p.barrio_osm ?? "",
        p.municipio_nombre ?? "",
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campana_clientes_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <aside className="panel-slide flex h-full w-80 shrink-0 flex-col border-l border-border bg-card/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Selección lazo</p>
          <p className="text-xs text-muted-foreground">
            {total > 0 ? `${total} clientes` : "Dibuja un polígono en el mapa"}
          </p>
        </div>
        {total > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear} aria-label="Limpiar">
            <X className="size-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
        {total === 0 ? (
          <p className="text-muted-foreground">
            Usa la herramienta de polígono (arriba a la izquierda del mapa) para
            encerrar una zona y ver estadísticas de campaña.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Clientes" value={String(total)} />
              <Stat label="Tarifa prom." value={formatCop(tarifaProm)} />
              <Stat label="En mora" value={pct(enMora, total)} />
              <Stat
                label="Quintil muni."
                value={
                  quintilMin != null
                    ? quintilMin === quintilMax
                      ? String(quintilMin)
                      : `${quintilMin}–${quintilMax}`
                    : "—"
                }
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Segmentos
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(segmentoCounts).map(([seg, count]) => (
                  <span
                    key={seg}
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${SEGMENTO_COLORS[seg] ?? "#94a3b8"}33`,
                      color: SEGMENTO_COLORS[seg] ?? "#94a3b8",
                    }}
                  >
                    {seg} ({count})
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Top barrios
              </p>
              <ul className="space-y-1">
                {topBarrios.map(([barrio, count]) => (
                  <li
                    key={barrio}
                    className="flex justify-between text-muted-foreground"
                  >
                    <span className="truncate pr-2">{barrio}</span>
                    <span className="font-medium text-foreground">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      {total > 0 && (
        <div className="border-t border-border p-4">
          <Button className="w-full" onClick={exportCsv}>
            <Download className="size-4" />
            Exportar CSV campaña
          </Button>
        </div>
      )}
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/50 p-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
