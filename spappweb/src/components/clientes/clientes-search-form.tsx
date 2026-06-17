"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ClientesSearchForm({ defaultQuery }: { defaultQuery: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultQuery);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    router.push(
      trimmed ? `/clientes?q=${encodeURIComponent(trimmed)}` : "/clientes",
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Placa, cédula o nombre…"
          className="min-h-11 pl-9"
          autoFocus
        />
      </div>
      <Button type="submit" className="min-h-11 w-full sm:w-auto">
        Buscar
      </Button>
    </form>
  );
}
