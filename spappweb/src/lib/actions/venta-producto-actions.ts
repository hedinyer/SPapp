"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

const ventaProductoSchema = z
  .object({
    clienteNombre: z.string().trim().min(1, "Nombre del cliente obligatorio"),
    clienteCedula: z.string().trim().optional(),
    clienteCelular: z.string().trim().min(10, "Celular inválido"),
    montoPagado: z.number().int().nonnegative().optional(),
    notas: z.string().trim().optional(),
    items: z
      .array(
        z.object({
          productoId: z.number().int().positive(),
          cantidad: z.number().int().positive(),
        }),
      )
      .min(1, "Agrega al menos un producto."),
  })
  .superRefine((data, ctx) => {
    const pagado = data.montoPagado ?? 0;
    if (pagado > 0 && data.items.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Agrega productos a la venta.",
        path: ["items"],
      });
    }
  });

export type VentaProductoInput = z.infer<typeof ventaProductoSchema>;

export interface VentaProductoItemRow {
  id: string;
  productoId: number;
  sku: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface VentaProductoRow {
  id: string;
  clienteNombre: string;
  clienteCedula: string | null;
  clienteCelular: string;
  total: number;
  montoPagado: number;
  notas: string | null;
  createdAt: string;
  items: VentaProductoItemRow[];
}

interface ResolvedLine {
  productoId: number;
  sku: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  stock: number;
}

const VENTA_PRODUCTO_SELECT =
  "id, cliente_nombre, cliente_cedula, cliente_celular, total, monto_pagado, notas, created_at";

function toItemRow(
  raw: Record<string, unknown>,
  producto: { sku: string; nombre: string },
): VentaProductoItemRow {
  return {
    id: String(raw.id),
    productoId: Number(raw.producto_id),
    sku: producto.sku,
    nombre: producto.nombre,
    cantidad: Number(raw.cantidad),
    precioUnitario: Number(raw.precio_unitario),
    subtotal: Number(raw.subtotal),
  };
}

function toVentaRow(
  raw: Record<string, unknown>,
  items: VentaProductoItemRow[],
): VentaProductoRow {
  return {
    id: String(raw.id),
    clienteNombre: String(raw.cliente_nombre),
    clienteCedula: raw.cliente_cedula ? String(raw.cliente_cedula) : null,
    clienteCelular: String(raw.cliente_celular),
    total: Number(raw.total),
    montoPagado: Number(raw.monto_pagado ?? 0),
    notas: raw.notas ? String(raw.notas) : null,
    createdAt: String(raw.created_at),
    items,
  };
}

export async function saveVentaProducto(
  input: VentaProductoInput,
): Promise<VentaProductoRow> {
  await requireAdminSession();
  const parsed = ventaProductoSchema.parse(input);
  const supabase = createAdminClient();

  const ids = [...new Set(parsed.items.map((i) => i.productoId))];
  const { data: productos, error: prodError } = await supabase
    .from("inventario_productos")
    .select("id, sku, nombre, precio, stock, activo")
    .in("id", ids);

  if (prodError) throw new Error(prodError.message);

  const byId = new Map(
    (productos ?? []).map((p) => [Number(p.id), p as Record<string, unknown>]),
  );

  const qtyByProduct = new Map<number, number>();
  for (const item of parsed.items) {
    qtyByProduct.set(
      item.productoId,
      (qtyByProduct.get(item.productoId) ?? 0) + item.cantidad,
    );
  }

  const lines: ResolvedLine[] = [];
  for (const [productoId, cantidad] of qtyByProduct) {
    const raw = byId.get(productoId);
    if (!raw || !raw.activo) {
      throw new Error(`Producto #${productoId} no disponible.`);
    }
    const stock = Number(raw.stock);
    if (stock < cantidad) {
      throw new Error(
        `Stock insuficiente para ${String(raw.nombre)} (disponible: ${stock}).`,
      );
    }
    const precioUnitario = Number(raw.precio);
    lines.push({
      productoId,
      sku: String(raw.sku),
      nombre: String(raw.nombre),
      cantidad,
      precioUnitario,
      subtotal: precioUnitario * cantidad,
      stock,
    });
  }

  const total = lines.reduce((sum, l) => sum + l.subtotal, 0);
  const montoPagado = parsed.montoPagado ?? total;
  if (montoPagado > total) {
    throw new Error("El pago no puede superar el total de la venta.");
  }

  const { data: ventaRaw, error: ventaError } = await supabase
    .from("ventas_producto")
    .insert({
      cliente_nombre: parsed.clienteNombre,
      cliente_cedula: parsed.clienteCedula || null,
      cliente_celular: parsed.clienteCelular,
      total,
      monto_pagado: montoPagado,
      notas: parsed.notas || null,
    })
    .select(VENTA_PRODUCTO_SELECT)
    .single();

  if (ventaError || !ventaRaw) throw new Error(ventaError?.message ?? "Error al guardar.");

  const ventaId = String(ventaRaw.id);

  const { data: insertedItems, error: itemsError } = await supabase
    .from("venta_producto_items")
    .insert(
      lines.map((l) => ({
        venta_id: ventaId,
        producto_id: l.productoId,
        cantidad: l.cantidad,
        precio_unitario: l.precioUnitario,
        subtotal: l.subtotal,
      })),
    )
    .select("id, producto_id, cantidad, precio_unitario, subtotal");

  if (itemsError || !insertedItems) {
    await supabase.from("ventas_producto").delete().eq("id", ventaId);
    throw new Error(itemsError?.message ?? "Error al guardar ítems.");
  }

  const decremented: { productoId: number; prevStock: number }[] = [];
  try {
    for (const line of lines) {
      const { data: updated, error: stockError } = await supabase
        .from("inventario_productos")
        .update({ stock: line.stock - line.cantidad })
        .eq("id", line.productoId)
        .eq("stock", line.stock)
        .select("id")
        .maybeSingle();

      if (stockError || !updated) {
        throw new Error(
          `No se pudo descontar stock de ${line.nombre}. Intenta de nuevo.`,
        );
      }
      decremented.push({ productoId: line.productoId, prevStock: line.stock });
    }
  } catch (err) {
    for (const d of [...decremented].reverse()) {
      await supabase
        .from("inventario_productos")
        .update({ stock: d.prevStock })
        .eq("id", d.productoId);
    }
    await supabase.from("venta_producto_items").delete().eq("venta_id", ventaId);
    await supabase.from("ventas_producto").delete().eq("id", ventaId);
    throw err instanceof Error ? err : new Error("No se pudo descontar stock.");
  }

  const itemRows = (insertedItems as Record<string, unknown>[]).map((raw) => {
    const line = lines.find((l) => l.productoId === Number(raw.producto_id))!;
    return toItemRow(raw, { sku: line.sku, nombre: line.nombre });
  });

  revalidatePath("/inbox");
  revalidatePath("/inventario");
  revalidatePath("/venta");

  return toVentaRow(ventaRaw as Record<string, unknown>, itemRows);
}
