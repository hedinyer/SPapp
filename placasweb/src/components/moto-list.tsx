"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/browser";
import {
  CONDICION_LABELS,
  motoIdentificador,
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
        <ul className="space-y-3">
          {motos.map((moto) => (
            <li key={moto.id}>
              <Link
                href={`/${moto.id}`}
                className="flex min-h-20 touch-manipulation gap-3 rounded-lg border border-neutral-200 p-3 active:bg-neutral-50"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={moto.foto_url}
                    alt={motoIdentificador(moto)}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                  <p className="truncate font-medium">
                    {motoIdentificador(moto)}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {moto.placa?.trim()
                      ? "Con placa"
                      : "Número de serie"}
                  </p>
                </div>
                <span
                  className={cn(
                    "self-center rounded-full px-2.5 py-1 text-xs font-medium",
                    moto.condicion === "nueva"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800",
                  )}
                >
                  {CONDICION_LABELS[moto.condicion]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
