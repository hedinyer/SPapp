"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Printer } from "lucide-react";
import type { VentaMotoRow } from "@/lib/actions/venta-moto-actions";
import { VenderMotoSheet } from "@/components/inbox/vender-moto-sheet";
import { printVentaMotoReceipt } from "@/lib/printing/venta-moto-receipt";
import type { BikeRow } from "@/lib/pipeline/types";
import { formatCop, formatDate } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function saldo(venta: VentaMotoRow): number | null {
  if (venta.valorVenta == null) return null;
  return Math.max(0, venta.valorVenta - venta.montoPagado);
}

function pagoLabel(venta: VentaMotoRow): string {
  if (venta.valorVenta == null) return "—";
  if (venta.montoPagado >= venta.valorVenta) return "Contado";
  if (venta.montoPagado > 0) return "Abono";
  return "Pendiente";
}

export function VentaContadoManager({
  ventas,
  bikes,
}: {
  ventas: VentaMotoRow[];
  bikes: BikeRow[];
}) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <div className="flex justify-end">
        <Button
          className="gap-2 bg-black text-white hover:bg-neutral-800"
          onClick={() => setSheetOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Nueva venta contado
        </Button>
      </div>

      {ventas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-200 py-12 text-center text-neutral-500">
          No hay ventas de contado registradas.
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-neutral-200 lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Moto</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Pagado</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {ventas.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(v.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{v.clienteNombre}</div>
                      <div className="text-xs text-neutral-500">
                        {v.clienteCedula} · {v.clienteCelular}
                      </div>
                    </TableCell>
                    <TableCell>
                      {v.modelo} · {v.color}
                      {v.chasis ? (
                        <div className="text-xs text-neutral-500">
                          Chasis {v.chasis}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {v.valorVenta != null ? formatCop(v.valorVenta) : "—"}
                    </TableCell>
                    <TableCell>{formatCop(v.montoPagado)}</TableCell>
                    <TableCell>
                      {saldo(v) != null ? formatCop(saldo(v)!) : "—"}
                    </TableCell>
                    <TableCell>{pagoLabel(v)}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Reimprimir recibo"
                        onClick={() => printVentaMotoReceipt(v)}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 lg:hidden">
            {ventas.map((v) => (
              <div
                key={v.id}
                className="rounded-lg border border-neutral-200 p-4 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{v.clienteNombre}</p>
                    <p className="text-neutral-500">
                      {v.modelo} · {v.color}
                    </p>
                  </div>
                  <span className="text-xs text-neutral-500">
                    {formatDate(v.createdAt)}
                  </span>
                </div>
                <dl className="mt-3 space-y-1">
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Precio</dt>
                    <dd>
                      {v.valorVenta != null ? formatCop(v.valorVenta) : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Pagado</dt>
                    <dd>{formatCop(v.montoPagado)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Saldo</dt>
                    <dd>
                      {saldo(v) != null ? formatCop(saldo(v)!) : "—"}
                    </dd>
                  </div>
                </dl>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full gap-2"
                  onClick={() => printVentaMotoReceipt(v)}
                >
                  <Printer className="h-4 w-4" />
                  Reimprimir
                </Button>
              </div>
            ))}
          </div>
        </>
      )}

      <VenderMotoSheet
        bikes={bikes}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSaved={() => router.refresh()}
      />
    </>
  );
}
