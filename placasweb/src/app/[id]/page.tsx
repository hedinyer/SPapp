"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MotoForm } from "@/components/moto-form";
import { createBrowserClient } from "@/lib/supabase/browser";
import type { MotoRow } from "@/lib/motos/types";

export default function EditarMotoPage() {
  const params = useParams<{ id: string }>();
  const [moto, setMoto] = useState<MotoRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createBrowserClient();
      const { data, error: fetchError } = await supabase
        .from("motos")
        .select("*")
        .eq("id", params.id)
        .maybeSingle();

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setError("Moto no encontrada.");
        setLoading(false);
        return;
      }

      setMoto(data as MotoRow);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (loading) {
    return <p className="text-sm text-neutral-500">Cargando moto…</p>;
  }

  if (error || !moto) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">{error ?? "Moto no encontrada."}</p>
        <Link href="/" className="text-sm text-neutral-500">
          ← Volver al inventario
        </Link>
      </div>
    );
  }

  return <MotoForm moto={moto} />;
}
