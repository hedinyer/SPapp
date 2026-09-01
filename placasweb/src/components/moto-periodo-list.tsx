"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { ArrowLeft, FileSpreadsheet, Search, X } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/browser";
import {
  resolveCruceDisplay,
  type CruceMotoEntry,
  type CrucePeriodoPayload,
} from "@/lib/motos/cruce";
import { motosToCsv } from "@/lib/motos/csv";
import {
  motoMatchesQuery,
  normalizeMotoQuery,
} from "@/lib/motos/search";
import {
  PERIODO_AGOSTO_2026,
  esSubida,
  fechaInventario,
  fechaLabel,
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

function matchesPeriodoSearch(
  moto: MotoRow,
  query: string,
  cruce?: CruceMotoEntry,
): boolean {
  const needle = normalizeMotoQuery(query);
  if (!needle) return true;
  if (motoMatchesQuery(moto, query)) return true;

  const info = resolveCruceDisplay(moto, cruce);
  const prenda = (info.prenda ?? moto.aliado ?? "").toUpperCase().replace(/\s+/g, "");
  if (prenda.includes(needle)) return true;

  const cliente = info.contratoActivo?.cliente?.toUpperCase().replace(/\s+/g, "") ?? "";
  return cliente.includes(needle);
}

export function MotoPeriodoList() {
  const [motos, setMotos] = useState<MotoRow[]>([]);
  const [cruce, setCruce] = useState<CrucePeriodoPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const searchId = useId();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createBrowserClient();
      const [motosRes, cruceRes] = await Promise.all([
        supabase
          .from("motos")
          .select("*")
          .gte("updated_at", `${desde}T00:00:00`)
          .lt("updated_at", "2026-09-03T00:00:00")
          .order("updated_at", { ascending: true }),
        fetch("/data/cruce-periodo-agosto.json"),
      ]);

      if (cancelled) return;

      if (motosRes.error) {
        setError(motosRes.error.message);
        setLoading(false);
        return;
      }

      const filtradas = ((motosRes.data as MotoRow[]) ?? []).filter((moto) =>
        motoEnPeriodo(moto, desde, hasta),
      );
      setMotos(filtradas);

      if (cruceRes.ok) {
        setCruce((await cruceRes.json()) as CrucePeriodoPayload);
      }

      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () =>
      motos.filter((moto) =>
        matchesPeriodoSearch(moto, query, cruce?.motos[moto.id]),
      ),
    [motos, query, cruce],
  );

  const grupos = useMemo(() => groupByUbicacionYDia(filtered), [filtered]);
  const resumen = useMemo(() => resumenPeriodo(filtered), [filtered]);
  const buscando = query.trim().length > 0;

  const diasActivos = useMemo(() => {
    const set = new Set(motos.map((m) => fechaInventario(m)));
    return [...set].sort();
  }, [motos]);

  function downloadCsv() {
    if (filtered.length === 0) return;
    const blob = new Blob([motosToCsv(filtered)], {
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
              {buscando ? (
                <>
                  {filtered.length} de {motos.length} moto
                  {motos.length === 1 ? "" : "s"}
                </>
              ) : (
                <>
                  {resumen.total} moto{resumen.total === 1 ? "" : "s"} ·{" "}
                  {resumen.subidas} subida{resumen.subidas === 1 ? "" : "s"} ·{" "}
                  {resumen.actualizadas} actualizada
                  {resumen.actualizadas === 1 ? "" : "s"}
                </>
              )}
            </p>
            {diasActivos.length > 0 ? (
              <p className="mt-1 text-xs text-neutral-500">
                Actividad:{" "}
                {diasActivos.map((d) => fechaLabel(d)).join(" · ")}
              </p>
            ) : null}
            {cruce ? (
              <p className="mt-1 text-xs text-neutral-500">
                Cruce Viaduct: {cruce.resumen.total - cruce.resumen.sin_viaduct}/
                {cruce.resumen.total} · datos de prenda, ventas y tarifas pagadas
              </p>
            ) : (
              <p className="mt-1 text-xs text-amber-700">
                Sin archivo de cruce Viaduct (ejecuta npm run cruce:agosto)
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={filtered.length === 0}
            className="inline-flex min-h-11 shrink-0 touch-manipulation items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            CSV
          </button>
        </div>
      </div>

      <div className="relative">
        <label htmlFor={searchId} className="sr-only">
          Buscar placa, serie o prenda
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
          aria-hidden="true"
        />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value.toUpperCase())}
          placeholder="Placa, serie o prenda…"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          className="h-12 w-full min-w-0 rounded-lg border border-neutral-200 bg-transparent py-1 pr-11 pl-10 text-base tracking-wide uppercase outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-neutral-400 focus-visible:border-black focus-visible:ring-3 focus-visible:ring-black/15"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute top-1/2 right-1 inline-flex size-11 -translate-y-1/2 touch-manipulation items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            aria-label="Borrar búsqueda"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {motos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-200 p-8 text-center">
          <p className="font-medium">Sin movimientos en este período</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-200 p-8 text-center">
          <p className="font-medium">Nada coincide con “{query.trim()}”</p>
          <p className="mt-1 text-sm text-neutral-500">
            Prueba otra placa, serie o nombre de prenda.
          </p>
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
                        <PeriodoMotoCard
                          moto={moto}
                          cruce={cruce?.motos[moto.id]}
                        />
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

function PeriodoMotoCard({
  moto,
  cruce,
}: {
  moto: MotoRow;
  cruce?: CruceMotoEntry;
}) {
  const titulo = motoIdentificador(moto);
  const accion = esSubida(moto) ? "Subida" : "Actualizada";
  const info = resolveCruceDisplay(moto, cruce);

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
          {info.marcaModelo ? (
            <p className="text-sm text-neutral-600">{info.marcaModelo}</p>
          ) : null}
          {info.prenda ? (
            <p className="truncate text-sm font-medium">
              Prenda: {info.prenda}
            </p>
          ) : info.sinViaduct ? (
            <p className="text-sm text-amber-700">Sin match en Viaduct</p>
          ) : null}
          <p className="text-sm text-neutral-600">
            {info.vecesVendida != null ? (
              <>
                Vendida {info.vecesVendida}{" "}
                {info.vecesVendida === 1 ? "vez" : "veces"}
              </>
            ) : (
              "Veces vendida: —"
            )}
            {info.tarifasViaduct != null ? (
              <>
                {" · "}
                {info.tarifasViaduct} tarifa
                {info.tarifasViaduct === 1 ? "" : "s"} pagada
                {info.tarifasViaduct === 1 ? "" : "s"}
              </>
            ) : null}
            {info.tarifasSpapp != null && info.tarifasSpapp > 0 ? (
              <> · App: {info.tarifasSpapp} tarifas</>
            ) : null}
          </p>
          {info.contratoActivo ? (
            <p className="truncate text-sm text-emerald-800">
              Crédito activo: {info.contratoActivo.cliente}
            </p>
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
