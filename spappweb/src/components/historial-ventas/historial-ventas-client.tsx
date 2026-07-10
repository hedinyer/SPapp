"use client";

import { useMemo, useState, useTransition } from "react";
import { Bike, Printer, Search, User } from "lucide-react";
import { toast } from "sonner";
import type { VentaProductoRow } from "@/lib/actions/venta-producto-actions";
import { printVentaProductoReceipt } from "@/lib/printing/venta-producto-receipt";
import { formatCop, formatDate } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
      venta.clienteNombreReal ?? "",
      venta.clienteCedula ?? "",
      venta.clienteCelular,
      venta.motoPlaca ?? "",
      venta.motoModelo ?? "",
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
          placeholder="Buscar por placa, cédula, cliente, celular o producto…"
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
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((venta) => (
            <VentaCard key={venta.id} venta={venta} />
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoThumb({
  src,
  alt,
  fallback,
}: {
  src: string | null;
  alt: string;
  fallback: "user" | "bike";
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-neutral-400">
      {fallback === "user" ? (
        <User className="h-8 w-8" />
      ) : (
        <Bike className="h-8 w-8" />
      )}
    </div>
  );
}

function VentaCard({ venta }: { venta: VentaProductoRow }) {
  const [printing, startPrint] = useTransition();
  const saldo = venta.total - venta.montoPagado;
  const titulo =
    venta.clienteNombreReal ??
    (venta.motoPlaca && venta.clienteNombre.toUpperCase() === venta.motoPlaca
      ? venta.motoPlaca
      : venta.clienteNombre);
  const subtituloParts = [
    venta.motoPlaca && venta.clienteNombreReal
      ? `Placa ${venta.motoPlaca}`
      : null,
    venta.motoModelo
      ? `${venta.motoModelo}${venta.motoColor ? ` · ${venta.motoColor}` : ""}`
      : null,
    venta.clienteCelular,
    venta.clienteCedula ? `CC ${venta.clienteCedula}` : null,
  ].filter(Boolean);

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
    <Card className="overflow-hidden border-neutral-200 shadow-none">
      <CardContent className="p-0">
        <div className="flex gap-0">
          <div className="flex w-[7.5rem] shrink-0 flex-col border-r border-neutral-100 sm:w-36">
            <div className="relative aspect-square overflow-hidden bg-neutral-50">
              <PhotoThumb
                src={venta.clienteSelfieUrl}
                alt={`Foto de ${titulo}`}
                fallback="user"
              />
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                Cliente
              </span>
            </div>
            <div className="relative aspect-square overflow-hidden border-t border-neutral-100 bg-neutral-50">
              <PhotoThumb
                src={venta.motoImagenUrl}
                alt={venta.motoModelo ? `Moto ${venta.motoModelo}` : "Moto"}
                fallback="bike"
              />
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                {venta.motoPlaca ?? "Moto"}
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{titulo}</p>
                {subtituloParts.length > 0 ? (
                  <p className="mt-0.5 text-sm text-neutral-500">
                    {subtituloParts.join(" · ")}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-neutral-400">
                  {formatDate(venta.createdAt)}
                </p>
              </div>
              <div className="shrink-0 sm:text-right">
                <p className="text-lg font-semibold tabular-nums">
                  {formatCop(venta.total)}
                </p>
                {saldo > 0 ? (
                  <p className="text-xs font-medium text-red-700">
                    Saldo {formatCop(saldo)}
                  </p>
                ) : (
                  <p className="text-xs font-medium text-green-700">Pagado</p>
                )}
              </div>
            </div>

            <ul className="mt-3 space-y-1.5 border-t border-neutral-100 pt-3">
              {venta.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-baseline justify-between gap-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.nombre}</p>
                    <p className="text-xs text-neutral-500">
                      {item.sku} · {item.cantidad} ×{" "}
                      {formatCop(item.precioUnitario)}
                    </p>
                  </div>
                  <p className="shrink-0 tabular-nums font-medium">
                    {formatCop(item.subtotal)}
                  </p>
                </li>
              ))}
            </ul>

            {venta.notas ? (
              <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                {venta.notas}
              </p>
            ) : null}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 w-full sm:w-auto"
              disabled={printing}
              onClick={handlePrint}
            >
              <Printer className="mr-1.5 h-4 w-4" />
              {printing ? "Imprimiendo…" : "Imprimir factura"}
            </Button>
          </div>
        </div>
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
