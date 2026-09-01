"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/browser";
import { motosToCsv } from "@/lib/motos/csv";
import {
  PERIODO_AGOSTO_2026,
  esSubida,
  fechaBogota,
  groupByUbicacionYDia,
  horaBogota,
  motoEnPeriodo,
  resumenPeriodo,
} from "@/lib/motos/periodo";
import {
  CONDICION_LABELS,
  motoIdentificador,
  type MotoRow,
} from "@/lib/motos/types";
import { cn } from "@/lib/utils";

const { desde, hasta, label: periodoLabel } = PERIODO_AGOSTO_2026;

export function MotoPeriodoList() {
  const [motos, setMotos] = useState<MotoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createBrowserClient();
      const { data, error: fetchError } = await supabase
        .from("motos")
        .select("*")
        .gte("updated_at", `${desde}T00:00:00`)
        .lt("updated_at", "2026-09-02T00:00:00")
        .order("updated_at", { ascending: true });

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      const filtradas = ((data as MotoRow[]) ?? []).filter((moto) =>
        motoEnPeriodo(moto, desde, hasta),
      );
      setMotos(filtradas);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const grupos = useMemo(() => groupByUbicacionYDia(motos), [motos]);
  const resumen = useMemo(() => resumenPeriodo(motos), [motos]);

  const diasActivos = useMemo(() => {
    const set = new Set(motos.map((m) => fechaBogota(m.updated_at)));
    return [...set].sort();
  }, [motos]);

  function downloadCsv() {
    if (motos.length === 0) return;
    const blob = new Blob([motosToCsv(motos)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `placas-${desde}-a-${hasta}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">Cargando período…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-neutral-600 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Inventario del día
        </Link>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{periodoLabel}</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {resumen.total} moto{resumen.total === 1 ? "" : "s"} ·{" "}
              {resumen.subidas} subida{resumen.subidas === 1 ? "" : "s"} ·{" "}
              {resumen.actualizadas} actualizada
              {resumen.actualizadas === 1 ? "" : "s"}
            </p>
            {diasActivos.length > 0 ? (
              <p className="mt-1 text-xs text-neutral-500">
                Actividad:{" "}
                {diasActivos
                  .map((d) => d.replace(/^2026-08-0/, "").replace("-", "/"))
                  .join(" y ")}
                {" ago"}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={motos.length === 0}
            className="inline-flex min-h-11 shrink-0 touch-manipulation items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            CSV
          </button>
        </div>
      </div>

      {motos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-200 p-8 text-center">
          <p className="font-medium">Sin movimientos en este período</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grupos.map((grupo) => (
            <section
              key={grupo.key}
              className="space-y-4"
              aria-labelledby={`periodo-${grupo.key}`}
            >
              <div className="flex items-baseline justify-between gap-2 border-b border-neutral-200 pb-1">
                <h2
                  id={`periodo-${grupo.key}`}
                  className="text-base font-semibold"
                >
                  {grupo.label}
                </h2>
                <span className="text-xs text-neutral-500">
                  {grupo.motos.length} moto{grupo.motos.length === 1 ? "" : "s"}
                </span>
              </div>

              {grupo.dias.map((dia) => (
                <div key={dia.fecha} className="space-y-3">
                  <h3 className="text-sm font-medium text-neutral-600">
                    {dia.label}
                    <span className="ml-2 font-normal text-neutral-400">
                      ({dia.motos.length})
                    </span>
                  </h3>
                  <ul className="space-y-3">
                    {dia.motos.map((moto) => (
                      <li key={moto.id}>
                        <PeriodoMotoCard moto={moto} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function PeriodoMotoCard({ moto }: { moto: MotoRow }) {
  const titulo = motoIdentificador(moto);
  const accion = esSubida(moto) ? "Subida" : "Actualizada";

  return (
    <article className="flex touch-manipulation gap-3 rounded-xl border border-neutral-200 p-3">
      <Link
        href={`/${moto.id}`}
        className="flex min-w-0 flex-1 gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black active:bg-neutral-50"
      >
        <div className="aspect-[9/16] w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100 outline outline-black/10 sm:w-24">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={moto.foto_url}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-lg font-bold tracking-wide">{titulo}</p>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                moto.condicion === "nueva"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800",
              )}
            >
              {CONDICION_LABELS[moto.condicion]}
            </span>
          </div>
          <p className="text-sm text-neutral-600">
            {accion} · {horaBogota(moto.updated_at)}
          </p>
          {moto.aliado?.trim() ? (
            <p className="truncate text-sm font-medium">{moto.aliado.trim()}</p>
          ) : null}
          {moto.notas?.trim() ? (
            <p className="line-clamp-2 text-sm text-neutral-500">
              {moto.notas.trim()}
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
