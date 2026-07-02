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
  notas: z.string().trim().optional(),
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
      notas: parsed.notas || null,
    })
    .select(
      "id, bike_id, modelo, color, placa, chasis, cliente_nombre, cliente_cedula, cliente_celular, cuota_inicial, notas, created_at",
    )
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/inbox");
  return toRow(data as Record<string, unknown>);
}
