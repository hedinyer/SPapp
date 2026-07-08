"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/browser";
import {
  CONDICION_LABELS,
  UBICACION_LABELS,
  UBICACION_ORDER,
  type MotoRow,
} from "@/lib/motos/types";
import { cn } from "@/lib/utils";

export function MotoList() {
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
          <p className="text-sm text-neutral-500">
            {motos.length} moto{motos.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/nueva"
          className="inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-lg bg-black px-4 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          Agregar
        </Link>
      </div>

      {motos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-200 p-8 text-center">
          <p className="text-sm text-neutral-500">Aún no hay motos registradas.</p>
          <Link
            href="/nueva"
            className="mt-4 inline-flex min-h-11 touch-manipulation items-center rounded-lg bg-black px-4 text-sm font-medium text-white"
          >
            Registrar primera moto
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {UBICACION_ORDER.map((ubicacion) => {
            const grupo = motos
              .filter((moto) => moto.ubicacion === ubicacion)
              .sort((a, b) => (b.pagos ?? -1) - (a.pagos ?? -1));
            if (grupo.length === 0) return null;

            return (
              <section key={ubicacion} className="space-y-3">
                <div className="flex items-baseline justify-between gap-2 border-b border-neutral-200 pb-1">
                  <h2 className="text-base font-semibold">
                    {UBICACION_LABELS[ubicacion]}
                  </h2>
                  <span className="text-xs text-neutral-500">
                    {grupo.length} moto{grupo.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ul className="space-y-4">
                  {grupo.map((moto) => (
                    <li key={moto.id}>
                      <MotoCard moto={moto} />
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

function MotoCard({ moto }: { moto: MotoRow }) {
  const placa = moto.placa?.trim().toUpperCase() || null;
  const titulo = placa ?? moto.numero_serie?.trim() ?? "Sin identificador";

  return (
    <Link
      href={`/${moto.id}`}
      className="flex touch-manipulation gap-4 rounded-xl border border-neutral-200 p-4 active:bg-neutral-50"
    >
      <div className="aspect-[9/16] w-28 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={moto.foto_url}
          alt={titulo}
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
            Vendida {moto.veces_vendida} vez{moto.veces_vendida === 1 ? "" : "es"}
          </p>
        ) : null}
        {moto.notas?.trim() ? (
          <p className="line-clamp-3 text-sm text-neutral-500">
            {moto.notas.trim()}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
