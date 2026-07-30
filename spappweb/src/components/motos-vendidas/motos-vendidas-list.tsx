"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { User } from "lucide-react";
import type { MotoVendidaRow } from "@/lib/actions/historial-motos-actions";
import { GARAJE_CONDICION_LABELS } from "@/lib/pipeline/types";
import { formatDateOnly } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function PhotoThumb({
  src,
  alt,
}: {
  src: string | null;
  alt: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className="h-full w-full object-cover" />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
      <User className="h-4 w-4" />
    </div>
  );
}

function TipoBadge({ tipo }: { tipo: MotoVendidaRow["tipoVenta"] }) {
  const label =
    tipo === "contado"
      ? "Contado"
      : tipo === "credito_a_contado"
        ? "Crédito → Contado"
        : "Crédito";
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-normal",
        tipo === "contado" &&
          "border-green-200 bg-green-50 text-green-800",
        tipo === "credito" && "border-sky-200 bg-sky-50 text-sky-800",
        tipo === "credito_a_contado" &&
          "border-amber-200 bg-amber-50 text-amber-900",
      )}
    >
      {label}
    </Badge>
  );
}

export function MotosVendidasList({ motos }: { motos: MotoVendidaRow[] }) {
  const [busqueda, setBusqueda] = useState("");

  const filtradas = useMemo(() => {
    const q = normalize(busqueda.trim());
    if (!q) return motos;
    const terms = q.split(/\s+/);
    return motos.filter((m) => {
      const haystack = normalize(
        [
          m.clienteNombre,
          m.placa ?? "",
          m.referencia ?? "",
          m.modelo,
          m.color,
          m.condicion ?? "",
          m.tipoVenta === "credito_a_contado"
            ? "credito contado"
            : m.tipoVenta,
        ].join(" "),
      );
      return terms.every((t) => haystack.includes(t));
    });
  }, [motos, busqueda]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Buscar
        </label>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Cliente, placa, referencia, modelo…"
          className="flex h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-neutral-400"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {filtradas.length} moto{filtradas.length === 1 ? "" : "s"}
      </p>

      {motos.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyTitle>Sin motos vendidas</EmptyTitle>
            <EmptyDescription>
              Aún no hay ventas de crédito entregadas ni ventas de contado.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : filtradas.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyTitle>Sin coincidencias</EmptyTitle>
            <EmptyDescription>
              Ninguna moto coincide con la búsqueda.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Condición</TableHead>
                  <TableHead>Fecha venta</TableHead>
                  <TableHead>Tipo venta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map((m) => (
                  <TableRow key={`${m.tipoVenta}-${m.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/50">
                          <PhotoThumb
                            src={m.selfieUrl}
                            alt={`Foto de ${m.clienteNombre}`}
                          />
                        </div>
                        {m.userId ? (
                          <Link
                            href={`/clientes/${m.userId}`}
                            className="font-medium hover:underline"
                          >
                            {m.clienteNombre}
                          </Link>
                        ) : (
                          <span className="font-medium">{m.clienteNombre}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{m.placa ?? "—"}</TableCell>
                    <TableCell>{m.referencia ?? "—"}</TableCell>
                    <TableCell>{m.modelo}</TableCell>
                    <TableCell>{m.color}</TableCell>
                    <TableCell>
                      {m.condicion
                        ? GARAJE_CONDICION_LABELS[m.condicion]
                        : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDateOnly(m.fechaVenta)}
                    </TableCell>
                    <TableCell>
                      <TipoBadge tipo={m.tipoVenta} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 lg:hidden">
            {filtradas.map((m) => (
              <div
                key={`${m.tipoVenta}-${m.id}`}
                className="rounded-lg border border-border p-4 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/50">
                      <PhotoThumb
                        src={m.selfieUrl}
                        alt={`Foto de ${m.clienteNombre}`}
                      />
                    </div>
                    <div className="min-w-0">
                      {m.userId ? (
                        <Link
                          href={`/clientes/${m.userId}`}
                          className="font-medium hover:underline"
                        >
                          {m.clienteNombre}
                        </Link>
                      ) : (
                        <p className="font-medium">{m.clienteNombre}</p>
                      )}
                      <p className="text-muted-foreground">
                        {m.modelo} · {m.color}
                      </p>
                    </div>
                  </div>
                  <TipoBadge tipo={m.tipoVenta} />
                </div>
                <dl className="mt-3 flex flex-col gap-1">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Placa</dt>
                    <dd>{m.placa ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Referencia</dt>
                    <dd>{m.referencia ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Condición</dt>
                    <dd>
                      {m.condicion
                        ? GARAJE_CONDICION_LABELS[m.condicion]
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Fecha venta</dt>
                    <dd>{formatDateOnly(m.fechaVenta)}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
