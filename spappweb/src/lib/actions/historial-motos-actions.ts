"use server";

import { requireAdminSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GarajeCondicion } from "@/lib/pipeline/types";
import { getVentasContado } from "@/lib/actions/venta-moto-actions";
import {
  mergeCreditoLuegoContado,
  type MotoVendidaMerged,
} from "@/lib/motos/merge-credito-contado";

export interface HistorialMotoVentaRow {
  id: string;
  origen: "contado" | "credito_liquidado";
  fecha: string;
  clienteNombre: string;
  clienteCedula: string | null;
  placa: string | null;
  modelo: string;
  color: string;
  monto: number;
  userId: number | null;
}

export type MotoVendidaRow = MotoVendidaMerged;

export async function listHistorialMotosCredito(): Promise<
  HistorialMotoVentaRow[]
> {
  await requireAdminSession();
  const supabase = createAdminClient();

  const { data: compras, error } = await supabase
    .from("user_moto_compra")
    .select(
      "id, user_id, modelo, color, placa, fecha_entrega, updated_at, users(user)",
    )
    .eq("estado", "saldada")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows: HistorialMotoVentaRow[] = [];
  for (const c of compras ?? []) {
    const { data: liq } = await supabase
      .from("pagos")
      .select("monto")
      .eq("user_moto_compra_id", c.id)
      .eq("contexto_pago", "liquidacion")
      .eq("estado", "confirmado")
      .order("confirmado_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const users = c.users as { user: string } | { user: string }[] | null;
    const username = Array.isArray(users) ? users[0]?.user : users?.user;

    rows.push({
      id: c.id as string,
      origen: "credito_liquidado",
      fecha: String(c.updated_at ?? c.fecha_entrega),
      clienteNombre: username ?? `#${c.user_id}`,
      clienteCedula: username ?? null,
      placa: (c.placa as string | null) ?? null,
      modelo: String(c.modelo),
      color: String(c.color),
      monto: Number(liq?.monto ?? 0),
      userId: Number(c.user_id),
    });
  }
  return rows;
}

/** Lista unificada de motos vendidas (crédito entregada/saldada + contado). */
export async function listMotosVendidas(): Promise<MotoVendidaRow[]> {
  await requireAdminSession();
  const supabase = createAdminClient();

  const [{ data: creditos, error }, contado] = await Promise.all([
    supabase
      .from("user_moto_compra")
      .select(
        "id, user_id, modelo, color, placa, referencia, fecha_entrega, seleccionado_at, users(id, user, users_documents(selfie_url)), garaje_motos!user_moto_compra_garaje_moto_id_fkey(condicion)",
      )
      .in("estado", ["entregada", "saldada"]),
    getVentasContado(),
  ]);
  if (error) throw new Error(error.message);

  const creditoRows = [];
  for (const c of creditos ?? []) {
    const users = c.users as
      | {
          id: number;
          user: string;
          users_documents?:
            | { selfie_url?: string | null }
            | { selfie_url?: string | null }[]
            | null;
        }
      | {
          id: number;
          user: string;
          users_documents?:
            | { selfie_url?: string | null }
            | { selfie_url?: string | null }[]
            | null;
        }[]
      | null;
    const user = Array.isArray(users) ? users[0] : users;
    const docRaw = user?.users_documents;
    const doc = Array.isArray(docRaw) ? docRaw[0] : docRaw;
    const garajeRaw = c.garaje_motos as
      | { condicion?: GarajeCondicion | null }
      | { condicion?: GarajeCondicion | null }[]
      | null;
    const garaje = Array.isArray(garajeRaw) ? garajeRaw[0] : garajeRaw;
    const cedula = user?.user ? String(user.user) : null;

    creditoRows.push({
      id: String(c.id),
      tipoVenta: "credito" as const,
      selfieUrl: doc?.selfie_url ? String(doc.selfie_url) : null,
      placa: (c.placa as string | null) ?? null,
      referencia: (c.referencia as string | null) ?? null,
      modelo: String(c.modelo),
      color: String(c.color),
      condicion: (garaje?.condicion as GarajeCondicion | null) ?? null,
      fechaVenta: String(c.fecha_entrega ?? c.seleccionado_at),
      clienteNombre: cedula ?? `#${c.user_id}`,
      clienteCedula: cedula,
      userId: Number(c.user_id),
    });
  }

  // ponytail: ventas_moto no guarda referencia/condición — mostrar "—" en UI
  const contadoRows = contado.map((v) => ({
    id: v.id,
    tipoVenta: "contado" as const,
    selfieUrl: v.selfieUrl ?? null,
    placa: v.placa,
    referencia: null,
    modelo: v.modelo,
    color: v.color,
    condicion: null,
    fechaVenta: v.createdAt,
    clienteNombre: v.clienteNombre,
    clienteCedula: v.clienteCedula,
    userId: null,
  }));

  return mergeCreditoLuegoContado(creditoRows, contadoRows);
}
