"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { searchClientesAction } from "@/lib/actions/clientes-search-actions";
import type { ClientSearchResult } from "@/lib/pipeline/types";
import { Input } from "@/components/ui/input";
import { ClientesSearchResults } from "@/components/clientes/clientes-search-results";

export function ClientesSearchLive({
  initialQuery,
  initialResults,
}: {
  initialQuery: string;
  initialResults: ClientSearchResult[];
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState(initialResults);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [pending, startTransition] = useTransition();
  const reqId = useRef(0);
  const firstRun = useRef(true);

  useEffect(() => {
    const q = query.trim();

    // URL sin recarga, para poder compartir/recargar la búsqueda
    const url = q ? `/clientes?q=${encodeURIComponent(q)}` : "/clientes";
    window.history.replaceState(null, "", url);

    // En el primer render ya tenemos los resultados del servidor
    if (firstRun.current) {
      firstRun.current = false;
      if (q === initialQuery.trim()) return;
    }

    if (q.length < 2) {
      setResults([]);
      setActiveQuery(q);
      return;
    }

    const handle = setTimeout(() => {
      const id = ++reqId.current;
      startTransition(async () => {
        try {
          const data = await searchClientesAction(q);
          if (id === reqId.current) {
            setResults(data);
            setActiveQuery(q);
          }
        } catch {
          // se ignora: el siguiente tecleo reintenta
        }
      });
    }, 250);

    return () => clearTimeout(handle);
  }, [query, initialQuery]);

  const trimmed = query.trim();

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Placa, cédula o nombre…"
          className="min-h-11 pl-9 pr-9"
          inputMode="search"
          autoFocus
        />
        {pending && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-400" />
        )}
      </div>

      {trimmed.length > 0 && trimmed.length < 2 && (
        <p className="text-sm text-neutral-500">
          Escribe al menos 2 caracteres para buscar.
        </p>
      )}

      {activeQuery.trim().length >= 2 && (
        <ClientesSearchResults results={results} query={activeQuery.trim()} />
      )}

      {trimmed.length >= 2 && activeQuery.trim().length < 2 && pending && (
        <p className="text-sm text-neutral-500">Buscando…</p>
      )}
    </div>
  );
}
