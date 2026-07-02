"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

const ventaMotoSchema = z.object({
  bikeId: z.number().int().positive().optional(),
  modelo: z.string().trim().min(1, "Modelo obligatorio"),
  color: z.string().trim().min(1, "Color obligatorio"),
  clienteNombre: z.string().trim().min(1, "Nombre del cliente obligatorio"),
  clienteCedula: z.string().trim().min(5, "Cédula inválida"),
  clienteCelular: z.string().trim().min(10, "Celular inválido"),
  chasis: z.string().trim().optional(),
  cuotaInicial: z.number().int().nonnegative().optional(),
  valorVenta: z.number().int().positive().optional(),
  montoPagado: z.number().int().nonnegative().optional(),
  notas: z.string().trim().optional(),
}).superRefine((data, ctx) => {
  const pagado = data.montoPagado ?? 0;
  if (pagado > 0 && !data.valorVenta) {
    ctx.addIssue({
      code: "custom",
      message: "Indica el valor total de la venta.",
      path: ["valorVenta"],
    });
  }
  if (data.valorVenta != null && pagado > data.valorVenta) {
    ctx.addIssue({
      code: "custom",
      message: "El pago no puede superar el valor de venta.",
      path: ["montoPagado"],
    });
  }
});

export type VentaMotoInput = z.infer<typeof ventaMotoSchema>;

export interface VentaMotoRow {
  id: string;
  bikeId: number | null;
  modelo: string;
  color: string;
  placa: string | null;
  chasis: string | null;
  clienteNombre: string;
  clienteCedula: string;
  clienteCelular: string;
  cuotaInicial: number | null;
  valorVenta: number | null;
  montoPagado: number;
  notas: string | null;
  createdAt: string;
}

function toRow(raw: Record<string, unknown>): VentaMotoRow {
  return {
    id: String(raw.id),
    bikeId: raw.bike_id != null ? Number(raw.bike_id) : null,
    modelo: String(raw.modelo),
    color: String(raw.color),
    placa: raw.placa ? String(raw.placa) : null,
    chasis: raw.chasis ? String(raw.chasis) : null,
    clienteNombre: String(raw.cliente_nombre),
    clienteCedula: String(raw.cliente_cedula),
    clienteCelular: String(raw.cliente_celular),
    cuotaInicial: raw.cuota_inicial != null ? Number(raw.cuota_inicial) : null,
    valorVenta: raw.valor_venta != null ? Number(raw.valor_venta) : null,
    montoPagado: Number(raw.monto_pagado ?? 0),
    notas: raw.notas ? String(raw.notas) : null,
    createdAt: String(raw.created_at),
  };
}

export async function saveVentaMoto(input: VentaMotoInput): Promise<VentaMotoRow> {
  await requireAdminSession();
  const parsed = ventaMotoSchema.parse(input);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("ventas_moto")
    .insert({
      bike_id: parsed.bikeId ?? null,
      modelo: parsed.modelo,
      color: parsed.color,
      placa: null,
      chasis: parsed.chasis || null,
      cliente_nombre: parsed.clienteNombre,
      cliente_cedula: parsed.clienteCedula,
      cliente_celular: parsed.clienteCelular,
      cuota_inicial: parsed.cuotaInicial ?? null,
      valor_venta: parsed.valorVenta ?? null,
      monto_pagado: parsed.montoPagado ?? 0,
      notas: parsed.notas || null,
    })
    .select(
      "id, bike_id, modelo, color, placa, chasis, cliente_nombre, cliente_cedula, cliente_celular, cuota_inicial, valor_venta, monto_pagado, notas, created_at",
    )
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/inbox");
  revalidatePath("/venta-contado");
  return toRow(data as Record<string, unknown>);
}

const VENTA_MOTO_SELECT =
  "id, bike_id, modelo, color, placa, chasis, cliente_nombre, cliente_cedula, cliente_celular, cuota_inicial, valor_venta, monto_pagado, notas, created_at";

export async function getVentasContado(): Promise<VentaMotoRow[]> {
  await requireAdminSession();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ventas_moto")
    .select(VENTA_MOTO_SELECT)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(toRow);
}
