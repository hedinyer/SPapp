"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  buildCajaInforme,
  type CajaEgresoRow,
  type CajaInformeIngresos,
} from "@/lib/caja/caja-informe";
import {
  CAJA_MEDIO_EGRESO_VALUES,
} from "@/lib/caja/caja-medios";
import { requireAdminSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

const CAJA_SESION_SELECT =
  "id, fecha, monto_apertura, monto_cierre, notas_apertura, notas_cierre, opened_at, closed_at, opened_by, closed_by, informe_cierre";

function todayBogota(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
  }).format(new Date());
}

export interface CajaMovimientoRow {
  id: string;
  tipo: "entrada" | "salida";
  monto: number;
  concepto: string;
  createdAt: string;
}

export interface CajaResumen {
  ventasProducto: number;
  ventasMoto: number;
  entradas: number;
  salidas: number;
  cantidadVentasProducto: number;
  cantidadVentasMoto: number;
}

export interface CajaSesionState {
  id: string;
  fecha: string;
  montoApertura: number;
  montoCierre: number | null;
  notasApertura: string | null;
  notasCierre: string | null;
  openedAt: string;
  closedAt: string | null;
  abierta: boolean;
  resumen: CajaResumen;
  movimientos: CajaMovimientoRow[];
  egresos: CajaEgresoRow[];
  informe: CajaInformeIngresos;
  efectivoEsperado: number;
  diferencia: number | null;
}

async function fetchSesionData(
  openedAt: string,
  closedAt: string | null,
  sesionId: string,
  montoApertura: number,
): Promise<{
  resumen: CajaResumen;
  movimientos: CajaMovimientoRow[];
  egresos: CajaEgresoRow[];
  informe: CajaInformeIngresos;
}> {
  const supabase = createAdminClient();
  const until = closedAt ?? new Date().toISOString();

  const [vpRes, vmRes, movRes, pagosRes, egresosRes] = await Promise.all([
    supabase
      .from("ventas_producto")
      .select("monto_pagado")
      .gte("created_at", openedAt)
      .lte("created_at", until),
    supabase
      .from("ventas_moto")
      .select("monto_pagado")
      .gte("created_at", openedAt)
      .lte("created_at", until),
    supabase
      .from("caja_movimientos")
      .select("id, tipo, monto, concepto, created_at")
      .eq("sesion_id", sesionId)
      .order("created_at", { ascending: true }),
    supabase
      .from("pagos")
      .select("id, monto, medio_pago_admin, contexto_pago, confirmado_at")
      .eq("estado", "confirmado")
      .gte("confirmado_at", openedAt)
      .lte("confirmado_at", until)
      .not("confirmado_at", "is", null),
    supabase
      .from("caja_egresos")
      .select("id, concepto, beneficiario, monto, medio_pago, notas, created_at")
      .eq("sesion_id", sesionId)
      .order("created_at", { ascending: true }),
  ]);

  if (vpRes.error) throw new Error(vpRes.error.message);
  if (vmRes.error) throw new Error(vmRes.error.message);
  if (movRes.error) throw new Error(movRes.error.message);
  if (pagosRes.error) throw new Error(pagosRes.error.message);
  if (egresosRes.error) throw new Error(egresosRes.error.message);

  const ventasProducto = (vpRes.data ?? []).reduce(
    (sum, v) => sum + Number(v.monto_pagado ?? 0),
    0,
  );
  const ventasMoto = (vmRes.data ?? []).reduce(
    (sum, v) => sum + Number(v.monto_pagado ?? 0),
    0,
  );

  const movimientos: CajaMovimientoRow[] = (movRes.data ?? []).map((m) => ({
    id: String(m.id),
    tipo: m.tipo as "entrada" | "salida",
    monto: Number(m.monto),
    concepto: String(m.concepto),
    createdAt: String(m.created_at),
  }));

  const entradas = movimientos
    .filter((m) => m.tipo === "entrada")
    .reduce((sum, m) => sum + m.monto, 0);
  const salidas = movimientos
    .filter((m) => m.tipo === "salida")
    .reduce((sum, m) => sum + m.monto, 0);

  const informe = buildCajaInforme({
    montoApertura,
    ventasProducto,
    ventasMoto,
    entradas,
    salidas,
    pagosRaw: (pagosRes.data ?? []).map((p) => ({
      id: String(p.id),
      monto: Number(p.monto),
      medio_pago_admin: p.medio_pago_admin ? String(p.medio_pago_admin) : null,
      contexto_pago: p.contexto_pago ? String(p.contexto_pago) : null,
      confirmado_at: String(p.confirmado_at),
    })),
    egresosRaw: (egresosRes.data ?? []).map((e) => ({
      id: String(e.id),
      concepto: String(e.concepto),
      beneficiario: e.beneficiario ? String(e.beneficiario) : null,
      monto: Number(e.monto),
      medio_pago: String(e.medio_pago),
      notas: e.notas ? String(e.notas) : null,
      created_at: String(e.created_at),
    })),
  });

  return {
    resumen: {
      ventasProducto,
      ventasMoto,
      entradas,
      salidas,
      cantidadVentasProducto: vpRes.data?.length ?? 0,
      cantidadVentasMoto: vmRes.data?.length ?? 0,
    },
    movimientos,
    egresos: informe.egresosDetalle,
    informe,
  };
}

function toSesionState(
  raw: Record<string, unknown>,
  resumen: CajaResumen,
  movimientos: CajaMovimientoRow[],
  egresos: CajaEgresoRow[],
  informe: CajaInformeIngresos,
): CajaSesionState {
  const montoApertura = Number(raw.monto_apertura);
  const montoCierre =
    raw.monto_cierre != null ? Number(raw.monto_cierre) : null;
  const closedAt = raw.closed_at ? String(raw.closed_at) : null;
  const efectivoEsperado = informe.efectivo.esperadoEnCaja;

  return {
    id: String(raw.id),
    fecha: String(raw.fecha),
    montoApertura,
    montoCierre,
    notasApertura: raw.notas_apertura ? String(raw.notas_apertura) : null,
    notasCierre: raw.notas_cierre ? String(raw.notas_cierre) : null,
    openedAt: String(raw.opened_at),
    closedAt,
    abierta: closedAt == null,
    resumen,
    movimientos,
    egresos,
    informe,
    efectivoEsperado,
    diferencia: montoCierre != null ? montoCierre - efectivoEsperado : null,
  };
}

export async function getCajaSesionHoy(): Promise<CajaSesionState | null> {
  await requireAdminSession();
  const supabase = createAdminClient();
  const fecha = todayBogota();

  const { data, error } = await supabase
    .from("caja_sesiones")
    .select(CAJA_SESION_SELECT)
    .eq("fecha", fecha)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const raw = data as Record<string, unknown>;
  const storedInforme = raw.informe_cierre as CajaInformeIngresos | null;

  const { resumen, movimientos, egresos, informe } = await fetchSesionData(
    String(raw.opened_at),
    raw.closed_at ? String(raw.closed_at) : null,
    String(raw.id),
    Number(raw.monto_apertura),
  );

  const informeFinal =
    raw.closed_at && storedInforme ? storedInforme : informe;

  return toSesionState(raw, resumen, movimientos, egresos, informeFinal);
}

const aperturaSchema = z.object({
  montoApertura: z.number().int().nonnegative(),
  notas: z.string().trim().optional(),
});

export async function abrirCaja(input: z.infer<typeof aperturaSchema>) {
  const session = await requireAdminSession();
  const parsed = aperturaSchema.parse(input);
  const supabase = createAdminClient();
  const fecha = todayBogota();

  const { data: existing } = await supabase
    .from("caja_sesiones")
    .select("id, closed_at")
    .eq("fecha", fecha)
    .maybeSingle();

  if (existing && !existing.closed_at) {
    throw new Error("La caja de hoy ya está abierta.");
  }
  if (existing?.closed_at) {
    throw new Error("La caja de hoy ya fue cerrada.");
  }

  const { data, error } = await supabase
    .from("caja_sesiones")
    .insert({
      fecha,
      monto_apertura: parsed.montoApertura,
      notas_apertura: parsed.notas || null,
      opened_by: session.userId ?? null,
    })
    .select(CAJA_SESION_SELECT)
    .single();

  if (error || !data) throw new Error(error?.message ?? "No se pudo abrir la caja.");

  revalidatePath("/caja");
  return getCajaSesionHoy();
}

const cierreSchema = z.object({
  sesionId: z.string().uuid(),
  montoCierre: z.number().int().nonnegative(),
  notas: z.string().trim().optional(),
});

export async function cerrarCaja(input: z.infer<typeof cierreSchema>) {
  const session = await requireAdminSession();
  const parsed = cierreSchema.parse(input);
  const supabase = createAdminClient();

  const { data: sesion, error: fetchError } = await supabase
    .from("caja_sesiones")
    .select(CAJA_SESION_SELECT)
    .eq("id", parsed.sesionId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!sesion) throw new Error("Sesión de caja no encontrada.");
  if (sesion.closed_at) throw new Error("La caja ya está cerrada.");

  const raw = sesion as Record<string, unknown>;
  const { informe } = await fetchSesionData(
    String(raw.opened_at),
    null,
    parsed.sesionId,
    Number(raw.monto_apertura),
  );

  const efectivoEsperado = informe.efectivo.esperadoEnCaja;
  const closedAt = new Date().toISOString();

  const { error } = await supabase
    .from("caja_sesiones")
    .update({
      monto_cierre: parsed.montoCierre,
      notas_cierre: parsed.notas || null,
      closed_at: closedAt,
      closed_by: session.userId ?? null,
      informe_cierre: informe,
    })
    .eq("id", parsed.sesionId)
    .is("closed_at", null);

  if (error) throw new Error(error.message);

  revalidatePath("/caja");

  const state = await getCajaSesionHoy();
  return {
    state,
    informe,
    efectivoEsperado,
    diferencia: parsed.montoCierre - efectivoEsperado,
  };
}

const movimientoSchema = z.object({
  sesionId: z.string().uuid(),
  tipo: z.enum(["entrada", "salida"]),
  monto: z.number().int().positive(),
  concepto: z.string().trim().min(1, "Indica el concepto."),
});

export async function registrarMovimientoCaja(
  input: z.infer<typeof movimientoSchema>,
) {
  const session = await requireAdminSession();
  const parsed = movimientoSchema.parse(input);
  const supabase = createAdminClient();

  const { data: sesion, error: fetchError } = await supabase
    .from("caja_sesiones")
    .select("id, closed_at")
    .eq("id", parsed.sesionId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!sesion) throw new Error("Sesión de caja no encontrada.");
  if (sesion.closed_at) throw new Error("La caja está cerrada.");

  const { error } = await supabase.from("caja_movimientos").insert({
    sesion_id: parsed.sesionId,
    tipo: parsed.tipo,
    monto: parsed.monto,
    concepto: parsed.concepto,
    created_by: session.userId ?? null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/caja");
  return getCajaSesionHoy();
}

const egresoSchema = z.object({
  sesionId: z.string().uuid(),
  concepto: z.string().trim().min(1, "Indica el concepto del pago."),
  beneficiario: z.string().trim().optional(),
  monto: z.number().int().positive(),
  medioPago: z.enum(CAJA_MEDIO_EGRESO_VALUES),
  notas: z.string().trim().optional(),
});

export async function registrarEgresoCaja(input: z.infer<typeof egresoSchema>) {
  const session = await requireAdminSession();
  const parsed = egresoSchema.parse(input);
  const supabase = createAdminClient();

  const { data: sesion, error: fetchError } = await supabase
    .from("caja_sesiones")
    .select("id, closed_at")
    .eq("id", parsed.sesionId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!sesion) throw new Error("Sesión de caja no encontrada.");
  if (sesion.closed_at) throw new Error("La caja está cerrada.");

  const { error } = await supabase.from("caja_egresos").insert({
    sesion_id: parsed.sesionId,
    concepto: parsed.concepto,
    beneficiario: parsed.beneficiario || null,
    monto: parsed.monto,
    medio_pago: parsed.medioPago,
    notas: parsed.notas || null,
    created_by: session.userId ?? null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/caja");
  return getCajaSesionHoy();
}
