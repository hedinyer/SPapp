"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { FileSpreadsheet, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase/browser";
import {
  CONDICION_LABELS,
  UBICACION_LABELS,
  UBICACION_ORDER,
  esInventariadaHoy,
  hoyBogota,
  isMotoUbicacion,
  motoIdentificador,
  writeLastUbicacion,
  type MotoRow,
  type MotoUbicacion,
} from "@/lib/motos/types";
import { motosToCsv, sortVisibleMotos } from "@/lib/motos/csv";
import { findMotoExact, normalizeMotoQuery } from "@/lib/motos/search";
import { cn } from "@/lib/utils";

type ScanResult =
  | { kind: "idle" }
  | { kind: "found"; moto: MotoRow; query: string }
  | { kind: "missing"; query: string }
  | { kind: "invalid"; message: string };

const ubicacionBtnClass =
  "inline-flex min-h-11 w-full touch-manipulation items-center justify-center rounded-lg border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-50";

export function MotoList() {
  const [motos, setMotos] = useState<MotoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [scan, setScan] = useState<ScanResult>({ kind: "idle" });
  const [statusMsg, setStatusMsg] = useState("");
  const searchId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingAssign, startAssign] = useTransition();
  const [pendingDelete, startDelete] = useTransition();

  const hoy = hoyBogota();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createBrowserClient();
      const { data, error: fetchError } = await supabase
        .from("motos")
        .select("*")
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setMotos((data as MotoRow[]) ?? []);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const hoyList = useMemo(
    () =>
      sortVisibleMotos(
        motos.filter((moto) => esInventariadaHoy(moto, hoy)),
      ),
    [motos, hoy],
  );

  const hoyCount = hoyList.length;

  function focusPlaca() {
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function runScan(raw = query) {
    const normalized = normalizeMotoQuery(raw);
    if (normalized.length < 5) {
      setScan({
        kind: "invalid",
        message: "Indica una placa válida (mín. 5 caracteres).",
      });
      focusPlaca();
      return;
    }

    const match = findMotoExact(motos, normalized);
    if (match) {
      const full = motos.find((m) => m.id === match.id) ?? (match as MotoRow);
      setScan({ kind: "found", moto: full, query: normalized });
      return;
    }

    setScan({ kind: "missing", query: normalized });
  }

  function assignUbicacion(moto: MotoRow, ubicacion: MotoUbicacion) {
    const label = motoIdentificador(moto);
    const previous = motos;
    const nextCount = esInventariadaHoy(moto, hoy) ? hoyCount : hoyCount + 1;

    setMotos((current) =>
      current.map((row) =>
        row.id === moto.id
          ? { ...row, ubicacion, inventariado_en: hoy }
          : row,
      ),
    );
    setScan({ kind: "idle" });
    setQuery("");
    writeLastUbicacion(ubicacion);
    setStatusMsg(
      `${label} en ${UBICACION_LABELS[ubicacion]}. Hoy: ${nextCount} inventariadas.`,
    );
    focusPlaca();

    startAssign(async () => {
      const supabase = createBrowserClient();
      const { error: updateError } = await supabase
        .from("motos")
        .update({ ubicacion, inventariado_en: hoy })
        .eq("id", moto.id);

      if (updateError) {
        setMotos(previous);
        toast.error(updateError.message);
        setStatusMsg("");
        return;
      }

      toast.success(`${label} → ${UBICACION_LABELS[ubicacion]}`);
    });
  }

  function downloadExcel() {
    if (hoyList.length === 0) return;
    const blob = new Blob([motosToCsv(hoyList)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventario-${hoy}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function removeMoto(moto: MotoRow) {
    const label = motoIdentificador(moto);
    if (!confirm(`¿Quitar ${label} del inventario?`)) return;

    const previous = motos;
    setMotos((current) => current.filter((row) => row.id !== moto.id));

    startDelete(async () => {
      const supabase = createBrowserClient();
      const { error: deleteError } = await supabase
        .from("motos")
        .delete()
        .eq("id", moto.id);

      if (deleteError) {
        setMotos(previous);
        toast.error(deleteError.message);
        return;
      }

      toast.success(`${label} eliminada.`);
    });
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">Cargando inventario…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Inventario del día</h1>
          <p className="text-sm text-neutral-500" aria-live="polite">
            Hoy: {hoyCount} inventariada{hoyCount === 1 ? "" : "s"}
            {motos.length > 0
              ? ` · ${motos.length} en catálogo`
              : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={downloadExcel}
            disabled={hoyList.length === 0}
            className="inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            Excel
          </button>
          <Link
            href="/nueva"
            className="inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-lg bg-black px-4 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva
          </Link>
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {statusMsg}
      </p>

      <section className="space-y-3" aria-labelledby="scan-heading">
        <h2 id="scan-heading" className="text-base font-semibold">
          Contar placa
        </h2>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            runScan();
          }}
        >
          <div>
            <label htmlFor={searchId} className="mb-1.5 block text-sm font-medium">
              Placa
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
                aria-hidden="true"
              />
              <input
                ref={inputRef}
                id={searchId}
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value.toUpperCase());
                  if (scan.kind !== "idle") setScan({ kind: "idle" });
                }}
                placeholder="Ej. DXA96H"
                autoCapitalize="characters"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="search"
                className="h-12 w-full min-w-0 rounded-lg border border-neutral-200 bg-transparent py-1 pr-11 pl-10 text-base tracking-wide uppercase outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-neutral-400 focus-visible:border-black focus-visible:ring-3 focus-visible:ring-black/15"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setScan({ kind: "idle" });
                    focusPlaca();
                  }}
                  className="absolute top-1/2 right-1 inline-flex size-11 -translate-y-1/2 touch-manipulation items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  aria-label="Borrar placa"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </div>
          <button
            type="submit"
            className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center rounded-lg bg-black px-4 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            Buscar
          </button>
        </form>

        {scan.kind === "invalid" ? (
          <p className="text-sm text-red-600" role="alert">
            {scan.message}
          </p>
        ) : null}

        {scan.kind === "found" ? (
          <div className="space-y-3 rounded-xl border border-neutral-200 p-4">
            <div className="flex gap-3">
              <div className="aspect-[9/16] w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100 outline outline-black/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={scan.moto.foto_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-bold tracking-wide">
                  {motoIdentificador(scan.moto)}
                </p>
                <p className="text-sm text-neutral-500">
                  {CONDICION_LABELS[scan.moto.condicion]}
                  {esInventariadaHoy(scan.moto, hoy) &&
                  isMotoUbicacion(scan.moto.ubicacion)
                    ? ` · ya hoy en ${UBICACION_LABELS[scan.moto.ubicacion]}`
                    : null}
                </p>
                {scan.moto.aliado?.trim() ? (
                  <p className="mt-1 truncate text-sm font-medium">
                    {scan.moto.aliado.trim()}
                  </p>
                ) : null}
              </div>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">¿Dónde está?</legend>
              <div className="grid grid-cols-2 gap-2">
                {UBICACION_ORDER.map((ubicacion) => (
                  <button
                    key={ubicacion}
                    type="button"
                    disabled={pendingAssign}
                    className={ubicacionBtnClass}
                    onClick={() => assignUbicacion(scan.moto, ubicacion)}
                  >
                    {UBICACION_LABELS[ubicacion]}
                  </button>
                ))}
              </div>
            </fieldset>
            <Link
              href={`/${scan.moto.id}`}
              className="inline-flex min-h-11 items-center text-sm text-neutral-500 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              Editar datos
            </Link>
          </div>
        ) : null}

        {scan.kind === "missing" ? (
          <div className="rounded-lg border border-dashed border-neutral-200 p-6 text-center">
            <p className="font-medium">No hay “{scan.query}” en el catálogo</p>
            <p className="mt-1 text-sm text-neutral-500">
              Regístrala con foto y ubicación.
            </p>
            <Link
              href={`/nueva?placa=${encodeURIComponent(scan.query)}`}
              className="mt-4 inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-lg bg-black px-4 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Registrar {scan.query}
            </Link>
          </div>
        ) : null}
      </section>

      <section className="space-y-4" aria-labelledby="hoy-heading">
        <h2 id="hoy-heading" className="text-base font-semibold">
          Contadas hoy
        </h2>

        {hoyList.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-200 p-8 text-center">
            <p className="font-medium">Todavía no hay conteo de hoy</p>
            <p className="mt-1 text-sm text-neutral-500">
              Escribe una placa arriba. Si ya existe, elige ubicación; si no,
              regístrala.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {UBICACION_ORDER.map((ubicacion) => {
              const grupo = hoyList.filter((moto) => moto.ubicacion === ubicacion);
              if (grupo.length === 0) return null;

              return (
                <div key={ubicacion} className="space-y-3">
                  <div className="flex items-baseline justify-between gap-2 border-b border-neutral-200 pb-1">
                    <h3
                      id={`ubicacion-${ubicacion}`}
                      className="text-base font-semibold"
                    >
                      {UBICACION_LABELS[ubicacion]}
                    </h3>
                    <span className="text-xs text-neutral-500">
                      {grupo.length} moto{grupo.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <ul
                    className="space-y-4"
                    aria-labelledby={`ubicacion-${ubicacion}`}
                  >
                    {grupo.map((moto) => (
                      <li key={moto.id}>
                        <MotoCard
                          moto={moto}
                          onRemove={() => removeMoto(moto)}
                          removing={pendingDelete}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function MotoCard({
  moto,
  onRemove,
  removing,
}: {
  moto: MotoRow;
  onRemove: () => void;
  removing: boolean;
}) {
  const placa = moto.placa?.trim().toUpperCase() || null;
  const titulo = motoIdentificador(moto);

  return (
    <article className="flex touch-manipulation gap-3 rounded-xl border border-neutral-200 p-3 sm:p-4">
      <Link
        href={`/${moto.id}`}
        className="flex min-w-0 flex-1 gap-4 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black active:bg-neutral-50"
      >
        <div className="aspect-[9/16] w-24 shrink-0 overflow-hidden rounded-lg bg-neutral-100 outline outline-black/10 sm:w-28">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={moto.foto_url}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-xl font-bold tracking-wide">{titulo}</p>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                moto.condicion === "nueva"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800",
              )}
            >
              {CONDICION_LABELS[moto.condicion]}
            </span>
          </div>
          {!placa && moto.numero_serie?.trim() ? (
            <p className="text-xs text-neutral-500">Número de serie</p>
          ) : null}
          {moto.aliado?.trim() ? (
            <p className="truncate text-base font-medium text-neutral-900">
              {moto.aliado.trim()}
            </p>
          ) : null}
          {moto.pagos != null ? (
            <p className="text-sm text-neutral-600">
              {moto.pagos} día{moto.pagos === 1 ? "" : "s"} pagado
              {moto.pagos === 1 ? "" : "s"}
            </p>
          ) : null}
          {moto.veces_vendida != null && moto.veces_vendida > 0 ? (
            <p className="text-sm text-neutral-600">
              Vendida {moto.veces_vendida}{" "}
              {moto.veces_vendida === 1 ? "vez" : "veces"}
            </p>
          ) : null}
          {moto.notas?.trim() ? (
            <p className="line-clamp-3 text-sm text-neutral-500">
              {moto.notas.trim()}
            </p>
          ) : null}
        </div>
      </Link>

      <button
        type="button"
        onClick={onRemove}
        disabled={removing}
        aria-label={`Quitar ${titulo} del inventario`}
        className="inline-flex size-11 shrink-0 touch-manipulation items-center justify-center self-start rounded-lg border border-neutral-200 text-neutral-700 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </article>
  );
}
