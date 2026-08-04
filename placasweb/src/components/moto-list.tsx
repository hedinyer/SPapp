"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase/browser";
import {
  CONDICION_LABELS,
  UBICACION_LABELS,
  UBICACION_ORDER,
  motoIdentificador,
  type MotoRow,
} from "@/lib/motos/types";
import { motoMatchesQuery, normalizeMotoQuery } from "@/lib/motos/search";
import { cn } from "@/lib/utils";

export function MotoList() {
  const [motos, setMotos] = useState<MotoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const searchId = useId();
  const [pendingDelete, startDelete] = useTransition();

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

  const filtered = useMemo(
    () => motos.filter((moto) => motoMatchesQuery(moto, query)),
    [motos, query],
  );

  const normalizedQuery = normalizeMotoQuery(query);
  const searching = normalizedQuery.length > 0;

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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Inventario</h1>
          <p className="text-sm text-neutral-500" aria-live="polite">
            {searching
              ? `${filtered.length} de ${motos.length} moto${motos.length === 1 ? "" : "s"}`
              : `${motos.length} moto${motos.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Link
          href={
            searching
              ? `/nueva?placa=${encodeURIComponent(normalizedQuery)}`
              : "/nueva"
          }
          className="inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-lg bg-black px-4 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Agregar
        </Link>
      </div>

      <div className="sticky top-0 z-10 -mx-4 border-b border-neutral-200 bg-white px-4 py-3">
        <label htmlFor={searchId} className="mb-1.5 block text-sm font-medium">
          Buscar placa
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value.toUpperCase())}
            placeholder="Ej. DXA96H"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            className="h-11 w-full min-w-0 rounded-lg border border-neutral-200 bg-transparent py-1 pr-11 pl-10 text-base tracking-wide uppercase outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-neutral-400 focus-visible:border-black focus-visible:ring-3 focus-visible:ring-black/15"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-1 inline-flex size-9 -translate-y-1/2 touch-manipulation items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              aria-label="Borrar búsqueda"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {motos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-200 p-8 text-center">
          <p className="font-medium">Aún no hay motos registradas</p>
          <p className="mt-1 text-sm text-neutral-500">
            Empieza el inventario agregando la primera.
          </p>
          <Link
            href="/nueva"
            className="mt-4 inline-flex min-h-11 touch-manipulation items-center rounded-lg bg-black px-4 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            Registrar primera moto
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-200 p-8 text-center">
          <p className="font-medium">No hay “{normalizedQuery}”</p>
          <p className="mt-1 text-sm text-neutral-500">
            Agrégala al inventario o prueba otra placa.
          </p>
          <Link
            href={`/nueva?placa=${encodeURIComponent(normalizedQuery)}`}
            className="mt-4 inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-lg bg-black px-4 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Agregar {normalizedQuery}
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {UBICACION_ORDER.map((ubicacion) => {
            const grupo = filtered
              .filter((moto) => moto.ubicacion === ubicacion)
              .sort((a, b) => (b.pagos ?? -1) - (a.pagos ?? -1));
            if (grupo.length === 0) return null;

            return (
              <section key={ubicacion} className="space-y-3" aria-labelledby={`ubicacion-${ubicacion}`}>
                <div className="flex items-baseline justify-between gap-2 border-b border-neutral-200 pb-1">
                  <h2 id={`ubicacion-${ubicacion}`} className="text-base font-semibold">
                    {UBICACION_LABELS[ubicacion]}
                  </h2>
                  <span className="text-xs text-neutral-500">
                    {grupo.length} moto{grupo.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ul className="space-y-4">
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
              </section>
            );
          })}
        </div>
      )}
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
