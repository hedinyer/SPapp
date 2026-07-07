"use client";

import { useMemo, useState, useTransition } from "react";
import { Printer, Search } from "lucide-react";
import { toast } from "sonner";
import type { VentaProductoRow } from "@/lib/actions/venta-producto-actions";
import { printVentaProductoReceipt } from "@/lib/printing/venta-producto-receipt";
import { formatCop, formatDate } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function searchableText(venta: VentaProductoRow): string {
  return normalize(
    [
      venta.clienteNombre,
      venta.clienteCedula ?? "",
      venta.clienteCelular,
      venta.notas ?? "",
      ...venta.items.flatMap((i) => [i.nombre, i.sku]),
    ].join(" "),
  );
}

export function HistorialVentasClient({
  ventas,
}: {
  ventas: VentaProductoRow[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return ventas;
    const terms = q.split(/\s+/);
    return ventas.filter((venta) => {
      const haystack = searchableText(venta);
      return terms.every((term) => haystack.includes(term));
    });
  }, [ventas, query]);

  const totalVendido = filtered.reduce((sum, v) => sum + v.total, 0);
  const totalUnidades = filtered.reduce(
    (sum, v) => sum + v.items.reduce((s, i) => s + i.cantidad, 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por cédula, cliente, celular o producto…"
          className="pl-9"
          inputMode="search"
        />
      </div>

      {ventas.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Ventas" value={String(filtered.length)} />
          <Stat label="Unidades vendidas" value={String(totalUnidades)} />
          <Stat label="Total vendido" value={formatCop(totalVendido)} />
        </div>
      )}

      {filtered.length === 0 ? (
        <Card className="border-neutral-200 shadow-none">
          <CardContent className="py-10 text-center text-sm text-neutral-500">
            {ventas.length === 0
              ? "Aún no hay ventas de productos registradas."
              : "Ninguna venta coincide con la búsqueda."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((venta) => (
            <VentaCard key={venta.id} venta={venta} />
          ))}
        </div>
      )}
    </div>
  );
}

function VentaCard({ venta }: { venta: VentaProductoRow }) {
  const [printing, startPrint] = useTransition();
  const saldo = venta.total - venta.montoPagado;

  function handlePrint() {
    startPrint(async () => {
      try {
        await printVentaProductoReceipt(venta);
      } catch {
        toast.error("No se pudo abrir la impresión de la factura.");
      }
    });
  }

  return (
    <Card className="border-neutral-200 shadow-none">
      <CardHeader className="flex flex-col gap-3 border-b border-neutral-100 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium">{venta.clienteNombre}</p>
          <p className="text-sm text-neutral-500">
            {venta.clienteCelular}
            {venta.clienteCedula ? ` · CC ${venta.clienteCedula}` : ""}
            {` · ${formatDate(venta.createdAt)}`}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start sm:text-right">
          <div>
            <p className="text-base font-semibold">{formatCop(venta.total)}</p>
            {saldo > 0 ? (
              <p className="text-xs font-medium text-red-700">
                Saldo {formatCop(saldo)}
              </p>
            ) : (
              <p className="text-xs font-medium text-green-700">Pagado</p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={printing}
            onClick={handlePrint}
          >
            <Printer className="mr-1.5 h-4 w-4" />
            {printing ? "Imprimiendo…" : "Imprimir factura"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ul className="divide-y divide-neutral-100">
          {venta.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{item.nombre}</p>
                <p className="text-neutral-500">
                  {item.sku} · {item.cantidad} × {formatCop(item.precioUnitario)}
                </p>
              </div>
              <p className="shrink-0 font-medium">{formatCop(item.subtotal)}</p>
            </li>
          ))}
        </ul>
        {venta.notas && (
          <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
            {venta.notas}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
