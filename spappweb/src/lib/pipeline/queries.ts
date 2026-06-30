import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { buildClientPipeline } from "@/lib/pipeline/step-logic";
import type {
  BikeRow,
  ClientPipeline,
  ClientSearchResult,
  DigitalContractRow,
  InboxListItem,
  InboxQueue,
  InboxQueueId,
  InventarioCategoriaRow,
  InventarioProductoRow,
  GarajeMotoRow,
  GarajeParqueaderoRow,
  VendidaMotoRow,
  MorosoEstado,
  MorosoRow,
  MotoParaRecogerRow,
  MotoRecogerEstado,
  AtrasoSnapshot,
  PagoHistorialRow,
  PagoRow,
  RentingResumen,
  SolicitudTallerRow,
  TarifaPagadaRow,
  UserDocumentRow,
  UserMotoCompraRow,
  UserRow,
  UserTrackingRow,
  VisitaRow,
  VisitadorRow,
} from "@/lib/pipeline/types";
import {
  cuotaFraction,
  cuotasFromMonto,
  describeMontoVariacion,
  roundCuotas,
} from "@/lib/payments/payment-metrics";
import {
  DIAS_MORA_BANDEJA,
  DIAS_RECOGER_BANDEJA,
  mergeRentingResumenWithAtraso,
} from "@/lib/pipeline/mora-utils";
import { formatCop } from "@/lib/utils/format";

function normalizeVisita(raw: unknown): VisitaRow | null {
  if (!raw) return null;
  const v = raw as VisitaRow;
  return {
    ...v,
    evidencia_fotos: v.evidencia_fotos ?? [],
    evidencia_videos: v.evidencia_videos ?? [],
    ubicacion_verificada: v.ubicacion_verificada ?? null,
    fecha_completada: v.fecha_completada ?? null,
    notas_visita: v.notas_visita ?? null,
  };
}

function joinUser(raw: unknown): UserRow | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const first = raw[0] as Record<string, unknown> | undefined;
    if (!first) return null;
    return { id: Number(first.id), user: String(first.user) };
  }
  const obj = raw as Record<string, unknown>;
  return { id: Number(obj.id), user: String(obj.user) };
}

export async function getClientPipeline(
  userId: number,
): Promise<ClientPipeline | null> {
  const supabase = createAdminClient();

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, user")
    .eq("id", userId)
    .maybeSingle();

  if (userError || !user) return null;

  const { data: document } = await supabase
    .from("users_documents")
    .select(
      "id, user_id, estado_solicitud, betado, motivo_rechazo, document_front_url, document_back_url, selfie_url, ubicacion_solicitud, hora_actualizacion, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: contract } = await supabase
    .from("digital_contracts")
    .select(
      "id, user_id, users_documents_id, status, hoja_vida_data, contrato_data, admin_data, signature_path, hoja_vida_pdf_path, contrato_pdf_path, signed_at, created_at, updated_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: visita } = await supabase
    .from("visitas")
    .select(
      "id, user_id, digital_contract_id, visitador_id, estado, cliente_nombre, cliente_celular, direccion_visita, barrio, fecha_programada, notas, evidencia_fotos, evidencia_videos, ubicacion_verificada, fecha_completada, notas_visita, created_at, updated_at, visitadores(id, nombre, foto_url, telefono, activo, user_id)",
    )
    .eq("user_id", userId)
    .maybeSingle();

  const { data: compra } = await supabase
    .from("user_moto_compra")
    .select(
      "id, user_id, bike_id, modelo, color, frecuencia_pago, cuota_inicial_monto, monto_cuota_periodo, monto_total_primer_pago, estado, pago_inicial_confirmado, pago_cuota_confirmado, placa, chasis, referencia, fecha_entrega, seleccionado_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  const { data: tracking } = await supabase
    .from("users_tracking")
    .select("id, user_id, seguimiento, ubicacion_1")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: tarifas } = await supabase
    .from("tarifas_pagadas")
    .select(
      "id, user_moto_compra_id, user_id, numero_periodo, fecha_vencimiento, monto_esperado, monto_pagado, estado, pagada_at, confirmada_por, notas",
    )
    .eq("user_id", userId)
    .order("numero_periodo");

  const { data: moroso } = await supabase
    .from("morosos")
    .select(
      "id, user_moto_compra_id, user_id, tarifa_vencida_id, dias_atraso, monto_adeudado, estado, fecha_ingreso",
    )
    .eq("user_id", userId)
    .eq("estado", "activo")
    .maybeSingle();

  const { data: recoger } = await supabase
    .from("motos_para_recoger")
    .select(
      "id, user_moto_compra_id, moroso_id, user_id, dias_atraso, monto_adeudado, estado, fecha_ingreso, fecha_recogida, notas",
    )
    .eq("user_id", userId)
    .in("estado", ["pendiente", "asignada"])
    .maybeSingle();

  const { data: atrasoRow } = compra
    ? await supabase
        .from("atrasos")
        .select("dias_atraso, monto_adeudado, estado")
        .eq("user_moto_compra_id", compra.id)
        .maybeSingle()
    : { data: null };

  const tarifaRows = (tarifas as TarifaPagadaRow[]) ?? [];

  const { data: pagos } = compra
    ? await supabase
        .from("pagos")
        .select(
          "id, user_moto_compra_id, user_id, monto, referencia, comprobante_url, contexto_pago, fecha_comprobante, confirmado_at, tarifa_objetivo_id, estado, medio_pago_admin",
        )
        .eq("user_moto_compra_id", compra.id)
        .eq("estado", "confirmado")
        .order("confirmado_at", { ascending: false })
    : { data: [] };

  const rentingResumenFromTarifas = buildRentingResumen(
    compra as UserMotoCompraRow | null,
    tarifaRows,
  );
  const rentingResumen = mergeRentingResumenWithAtraso(
    compra as UserMotoCompraRow | null,
    rentingResumenFromTarifas,
    (atrasoRow as AtrasoSnapshot | null) ?? null,
  );

  const pagosHistorial = buildPagosHistorial(
    compra as UserMotoCompraRow | null,
    (pagos as PagoRow[]) ?? [],
    tarifaRows,
  );

  return buildClientPipeline({
    user: user as UserRow,
    document: (document as UserDocumentRow | null) ?? null,
    contract: (contract as DigitalContractRow | null) ?? null,
    visita: normalizeVisita(visita),
    compra: (compra as UserMotoCompraRow | null) ?? null,
    tracking: (tracking as UserTrackingRow | null) ?? null,
    tarifas: tarifaRows,
    moroso: (moroso as MorosoRow | null) ?? null,
    recoger: (recoger as MotoParaRecogerRow | null) ?? null,
    atraso: (atrasoRow as AtrasoSnapshot | null) ?? null,
    rentingResumen,
    pagosHistorial,
    pagos: (pagos as PagoRow[]) ?? [],
  });
}

function buildRentingResumen(
  compra: UserMotoCompraRow | null,
  tarifas: TarifaPagadaRow[],
): RentingResumen | null {
  if (!compra || compra.estado !== "entregada") return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalPagado = 0;
  let totalAdeudado = 0;
  let cuotasPagadas = 0;
  let cuotasPendientes = 0;
  let cuotasVencidas = 0;
  let diasAtraso: number | null = null;
  let proximoVencimiento: string | null = null;

  for (const tarifa of tarifas) {
    const pagadoParcial = tarifa.monto_pagado ?? 0;

    if (tarifa.estado === "pagada") {
      const pagado = pagadoParcial || tarifa.monto_esperado;
      cuotasPagadas += cuotaFraction(pagado, tarifa.monto_esperado);
      totalPagado += pagado;
    } else {
      if (pagadoParcial > 0) {
        cuotasPagadas += cuotaFraction(pagadoParcial, tarifa.monto_esperado);
        totalPagado += pagadoParcial;
      }

      if (tarifa.estado === "pendiente") {
        cuotasPendientes++;
        if (!proximoVencimiento) proximoVencimiento = tarifa.fecha_vencimiento;
      } else if (tarifa.estado === "vencida") {
        cuotasVencidas++;
        totalAdeudado += tarifa.monto_esperado - pagadoParcial;
        const venc = new Date(tarifa.fecha_vencimiento);
        venc.setHours(0, 0, 0, 0);
        const atraso = Math.floor(
          (today.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (diasAtraso === null || atraso > diasAtraso) diasAtraso = atraso;
      }
    }
  }

  return {
    totalPagado,
    totalAdeudado,
    cuotasPagadas: roundCuotas(cuotasPagadas),
    cuotasPendientes,
    cuotasVencidas,
    diasAtraso,
    proximoVencimiento,
  };
}

function buildPagosHistorial(
  compra: UserMotoCompraRow | null,
  pagos: PagoRow[],
  tarifas: TarifaPagadaRow[],
): PagoHistorialRow[] {
  if (!compra) return [];

  const tarifaById = new Map(tarifas.map((t) => [t.id, t]));

  return pagos.map((pago) => {
    const tarifa = pago.tarifa_objetivo_id
      ? tarifaById.get(pago.tarifa_objetivo_id)
      : undefined;

    let montoEsperado: number | null = null;
    if (pago.contexto_pago === "inicial") {
      montoEsperado = compra.cuota_inicial_monto;
    } else if (pago.contexto_pago === "cuota_adelantada") {
      montoEsperado = compra.monto_cuota_periodo;
    } else if (tarifa) {
      montoEsperado = tarifa.monto_esperado;
    } else if (pago.contexto_pago === "tarifa") {
      montoEsperado = compra.monto_cuota_periodo;
    }

    const cuotasCubiertas =
      pago.contexto_pago === "inicial"
        ? 0
        : cuotasFromMonto(pago.monto, compra.monto_cuota_periodo);

    const variacion =
      montoEsperado != null
        ? describeMontoVariacion(pago.monto, montoEsperado)
        : { label: "—", diff: 0, tone: "exacto" as const };

    return {
      id: pago.id,
      fecha: pago.fecha_comprobante ?? pago.confirmado_at ?? "",
      monto: pago.monto,
      montoEsperado,
      referencia: pago.referencia,
      contexto_pago: pago.contexto_pago,
      numeroPeriodo: tarifa?.numero_periodo ?? null,
      cuotasCubiertas,
      variacionLabel: variacion.label,
      variacionTone: variacion.tone,
      comprobante_url: pago.comprobante_url,
    };
  });
}

/** user_ids de clientes con solicitud (users_documents) y sin ninguna visita. */
async function clientUserIdsWithoutVisita(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<number[]> {
  const [{ data: docs }, { data: visitas }] = await Promise.all([
    supabase.from("users_documents").select("user_id"),
    supabase.from("visitas").select("user_id"),
  ]);
  const withVisita = new Set((visitas ?? []).map((v) => v.user_id as number));
  const ids = new Set<number>();
  for (const d of docs ?? []) {
    const uid = d.user_id as number;
    if (!withVisita.has(uid)) ids.add(uid);
  }
  return [...ids];
}

function sinVisitaSubtitle(estado: string): string {
  if (estado === "aceptada") return "Crédito aprobado · sin visita";
  if (estado === "rechazada") return "Crédito rechazado · sin visita";
  return "Solicitud pendiente · sin visita";
}

export async function getInboxQueues(): Promise<InboxQueue[]> {
  const supabase = createAdminClient();

  const [
    creditosIds,
    visitasSinAsignar,
    visitasProgramadas,
    pagos,
    retiro,
    entrega,
    morosos,
    recoger,
    solicitudesTaller,
  ] = await Promise.all([
    clientUserIdsWithoutVisita(supabase),
    supabase
      .from("visitas")
      .select("id", { count: "exact", head: true })
      .eq("estado", "pendiente_asignacion"),
    supabase
      .from("visitas")
      .select("id", { count: "exact", head: true })
      .eq("estado", "asignada"),
    supabase
      .from("user_moto_compra")
      .select("id", { count: "exact", head: true })
      .eq("estado", "pendiente_pago")
      .or(
        "pago_inicial_confirmado.eq.false,pago_cuota_confirmado.eq.false",
      ),
    supabase
      .from("user_moto_compra")
      .select("id", { count: "exact", head: true })
      .eq("estado", "lista_retiro")
      .is("placa", null),
    supabase
      .from("user_moto_compra")
      .select("id", { count: "exact", head: true })
      .eq("estado", "lista_retiro")
      .not("placa", "is", null),
    supabase
      .from("morosos")
      .select("id", { count: "exact", head: true })
      .eq("estado", "activo")
      .gte("dias_atraso", DIAS_MORA_BANDEJA)
      .lt("dias_atraso", DIAS_RECOGER_BANDEJA),
    supabase
      .from("motos_para_recoger")
      .select("id", { count: "exact", head: true })
      .eq("estado", "pendiente"),
    supabase
      .from("solicitudes_taller")
      .select("id", { count: "exact", head: true })
      .eq("estado", "pendiente"),
  ]);

  return [
    {
      id: "creditos",
      label: "Revisar solicitudes",
      description: "Clientes que aún no tienen visita",
      count: creditosIds.length,
    },
    {
      id: "pagos",
      label: "Confirmar pagos",
      description: "Pagos iniciales por verificar",
      count: pagos.count ?? 0,
    },
    {
      id: "retiro",
      label: "Preparar retiro",
      description: "Motos pagadas sin datos de placa",
      count: retiro.count ?? 0,
    },
    {
      id: "entrega",
      label: "Registrar entrega",
      description: "Motos listas para marcar como entregadas",
      count: entrega.count ?? 0,
    },
    {
      id: "visitas_sin_asignar",
      label: "Asignar visitas",
      description: "Visitas domiciliarias sin visitador",
      count: visitasSinAsignar.count ?? 0,
    },
    {
      id: "visitas_programadas",
      label: "Completar visitas",
      description: "Visitas ya programadas con visitador",
      count: visitasProgramadas.count ?? 0,
    },
    {
      id: "morosos",
      label: "Clientes en mora",
      description: "Exactamente 3 días de atraso en tarifas",
      count: morosos.count ?? 0,
    },
    {
      id: "recoger",
      label: "Motos para recoger",
      description: "Mora de 4+ días — recuperación",
      count: recoger.count ?? 0,
    },
    {
      id: "solicitudes_taller",
      label: "Solicitudes taller",
      description: "Repuestos, reparaciones y cambio de aceite",
      count: solicitudesTaller.count ?? 0,
    },
  ];
}

export async function getInboxListItems(
  queueId: InboxQueueId,
): Promise<InboxListItem[]> {
  const supabase = createAdminClient();

  switch (queueId) {
    case "creditos": {
      const [{ data }, { data: visitas }] = await Promise.all([
        supabase
          .from("users_documents")
          .select("user_id, estado_solicitud, created_at, users(id, user)")
          .order("created_at", { ascending: true }),
        supabase.from("visitas").select("user_id"),
      ]);

      const withVisita = new Set(
        (visitas ?? []).map((v) => v.user_id as number),
      );
      const seen = new Set<number>();
      const items: InboxListItem[] = [];
      for (const row of data ?? []) {
        const uid = row.user_id as number;
        if (withVisita.has(uid) || seen.has(uid)) continue;
        seen.add(uid);
        const users = joinUser(row.users);
        items.push({
          userId: uid,
          username: users?.user ?? `#${uid}`,
          displayName: users?.user ?? `Cliente ${uid}`,
          subtitle: sinVisitaSubtitle(row.estado_solicitud as string),
          queueId,
        });
      }
      return items;
    }
    case "visitas_sin_asignar":
    case "visitas_programadas": {
      const estado =
        queueId === "visitas_sin_asignar"
          ? "pendiente_asignacion"
          : "asignada";
      const { data } = await supabase
        .from("visitas")
        .select("user_id, cliente_nombre, created_at, users(id, user)")
        .eq("estado", estado)
        .order("created_at", { ascending: true });

      return (data ?? []).map((row) => {
        const users = joinUser(row.users);
        return {
          userId: row.user_id as number,
          username: users?.user ?? `#${row.user_id}`,
          displayName:
            (row.cliente_nombre as string | null) ??
            users?.user ??
            `Cliente ${row.user_id}`,
          subtitle:
            queueId === "visitas_sin_asignar"
              ? "Visita sin asignar"
              : "Visita programada",
          queueId,
        };
      });
    }
    case "pagos": {
      const { data } = await supabase
        .from("user_moto_compra")
        .select("user_id, modelo, color, users(id, user)")
        .eq("estado", "pendiente_pago")
        .or(
          "pago_inicial_confirmado.eq.false,pago_cuota_confirmado.eq.false",
        )
        .order("seleccionado_at", { ascending: true });

      return (data ?? []).map((row) => {
        const users = joinUser(row.users);
        return {
          userId: row.user_id as number,
          username: users?.user ?? `#${row.user_id}`,
          displayName: users?.user ?? `Cliente ${row.user_id}`,
          subtitle: `${row.modelo} · ${row.color}`,
          queueId,
        };
      });
    }
    case "retiro": {
      const { data } = await supabase
        .from("user_moto_compra")
        .select("user_id, modelo, color, users(id, user)")
        .eq("estado", "lista_retiro")
        .is("placa", null)
        .order("updated_at", { ascending: true });

      return (data ?? []).map((row) => {
        const users = joinUser(row.users);
        return {
          userId: row.user_id as number,
          username: users?.user ?? `#${row.user_id}`,
          displayName: users?.user ?? `Cliente ${row.user_id}`,
          subtitle: `${row.modelo} · Falta placa`,
          queueId,
        };
      });
    }
    case "entrega": {
      const { data } = await supabase
        .from("user_moto_compra")
        .select("user_id, modelo, color, placa, users(id, user)")
        .eq("estado", "lista_retiro")
        .not("placa", "is", null)
        .order("updated_at", { ascending: true });

      return (data ?? []).map((row) => {
        const users = joinUser(row.users);
        return {
          userId: row.user_id as number,
          username: users?.user ?? `#${row.user_id}`,
          displayName: users?.user ?? `Cliente ${row.user_id}`,
          subtitle: `${row.modelo} · Placa ${row.placa}`,
          queueId,
        };
      });
    }
    case "morosos": {
      const { data } = await supabase
        .from("morosos")
        .select(
          "user_id, dias_atraso, monto_adeudado, users(id, user), user_moto_compra(modelo, color, placa)",
        )
        .eq("estado", "activo")
        .gte("dias_atraso", DIAS_MORA_BANDEJA)
        .lt("dias_atraso", DIAS_RECOGER_BANDEJA)
        .order("dias_atraso", { ascending: false });

      return (data ?? []).map((row) => {
        const users = joinUser(row.users);
        const compra = row.user_moto_compra as {
          modelo?: string;
          color?: string;
          placa?: string | null;
        } | null;
        return {
          userId: row.user_id as number,
          username: users?.user ?? `#${row.user_id}`,
          displayName: users?.user ?? `Cliente ${row.user_id}`,
          subtitle: `${compra?.modelo ?? "Moto"} · ${row.dias_atraso} días · ${formatCop(row.monto_adeudado)} · ${compra?.placa ?? "sin placa"}`,
          queueId,
        };
      });
    }
    case "recoger": {
      const { data } = await supabase
        .from("motos_para_recoger")
        .select(
          "user_id, dias_atraso, monto_adeudado, users(id, user), user_moto_compra(modelo, color, placa)",
        )
        .eq("estado", "pendiente")
        .order("fecha_ingreso", { ascending: true });

      return (data ?? []).map((row) => {
        const users = joinUser(row.users);
        const compra = row.user_moto_compra as {
          modelo?: string;
          color?: string;
          placa?: string | null;
        } | null;
        return {
          userId: row.user_id as number,
          username: users?.user ?? `#${row.user_id}`,
          displayName: users?.user ?? `Cliente ${row.user_id}`,
          subtitle: `Recoger ${compra?.modelo ?? "moto"} · ${row.dias_atraso} días · ${formatCop(row.monto_adeudado)}`,
          queueId,
        };
      });
    }
    case "solicitudes_taller": {
      const { data } = await supabase
        .from("solicitudes_taller")
        .select(
          "id, user_id, tipo, estado, total_estimado, created_at, users(id, user), user_moto_compra(modelo, placa)",
        )
        .eq("estado", "pendiente")
        .order("created_at", { ascending: true });

      return (data ?? []).map((row) => {
        const users = joinUser(row.users);
        const compra = row.user_moto_compra as {
          modelo?: string;
          placa?: string | null;
        } | null;
        const tipoLabel =
          row.tipo === "repuestos"
            ? "Repuestos"
            : row.tipo === "reparacion"
              ? "Reparación"
              : "Cambio aceite";
        return {
          userId: row.user_id as number,
          username: users?.user ?? `#${row.user_id}`,
          displayName: users?.user ?? `Cliente ${row.user_id}`,
          subtitle: `${tipoLabel} · ${compra?.modelo ?? "Moto"}`,
          queueId,
        };
      });
    }
    default:
      return [];
  }
}

export async function getAllCategorias(): Promise<InventarioCategoriaRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("inventario_categorias")
    .select("id, nombre, slug, descripcion, activo, orden")
    .order("orden")
    .order("nombre");
  return (data as InventarioCategoriaRow[]) ?? [];
}

export async function getAllProductos(): Promise<InventarioProductoRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("inventario_productos")
    .select(
      "id, categoria_id, sku, nombre, descripcion, precio, stock, stock_minimo, imagen_url, compatible_modelos, activo, inventario_categorias(id, nombre, slug, descripcion, activo, orden)",
    )
    .order("nombre");
  return ((data ?? []) as unknown as InventarioProductoRow[]);
}

const productoSelect =
  "id, categoria_id, sku, nombre, descripcion, precio, stock, stock_minimo, imagen_url, compatible_modelos, activo, inventario_categorias(id, nombre, slug, descripcion, activo, orden)";

export async function getProductoBySku(
  sku: string,
): Promise<InventarioProductoRow | null> {
  const normalized = sku.trim().toUpperCase();
  if (!normalized) return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("inventario_productos")
    .select(productoSelect)
    .eq("sku", normalized)
    .eq("activo", true)
    .maybeSingle();
  return (data as InventarioProductoRow | null) ?? null;
}

export async function getAllSolicitudesTaller(): Promise<SolicitudTallerRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("solicitudes_taller")
    .select(
      "id, user_id, user_moto_compra_id, tipo, estado, notas_cliente, notas_admin, fecha_preferida, descripcion_falla, total_estimado, created_at, updated_at, users(id, user), user_moto_compra(id, modelo, color, placa, frecuencia_pago, cuota_inicial_monto, monto_cuota_periodo, monto_total_primer_pago, estado, pago_inicial_confirmado, pago_cuota_confirmado, bike_id, seleccionado_at), solicitud_repuesto_items(id, solicitud_id, producto_id, cantidad, precio_unitario, subtotal, inventario_productos(id, nombre, sku, precio))",
    )
    .order("created_at", { ascending: false });
  return ((data ?? []) as unknown as SolicitudTallerRow[]);
}

export async function getActiveVisitadores(): Promise<VisitadorRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("visitadores")
    .select("id, nombre, foto_url, telefono, activo, user_id, users(id, user)")
    .eq("activo", true)
    .not("user_id", "is", null)
    .order("nombre");
  return ((data ?? []) as unknown as VisitadorRow[]);
}

export async function getAllVisitadores(): Promise<VisitadorRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("visitadores")
    .select("id, nombre, foto_url, telefono, activo, user_id, users(id, user)")
    .order("nombre");
  return ((data ?? []) as unknown as VisitadorRow[]);
}

export async function getAllBikes(): Promise<BikeRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("bike_table")
    .select(
      "id, modelo, color, imagen_url, stock, cuota_inicial, cuota_diaria, descripcion, activo",
    )
    .order("modelo")
    .order("color");
  return (data as BikeRow[]) ?? [];
}

export async function getAllVendidasMotos(): Promise<VendidaMotoRow[]> {
  const supabase = createAdminClient();
  const [{ data }, { data: atrasos }] = await Promise.all([
    supabase
      .from("user_moto_compra")
      .select(
        "id, user_id, bike_id, modelo, color, frecuencia_pago, cuota_inicial_monto, monto_cuota_periodo, monto_total_primer_pago, estado, pago_inicial_confirmado, pago_cuota_confirmado, placa, chasis, referencia, fecha_entrega, estado_fisico, seleccionado_at, users(id, user), morosos(estado, dias_atraso, monto_adeudado), motos_para_recoger(estado, dias_atraso), garaje_motos(id)",
      )
      .eq("estado", "entregada")
      .order("fecha_entrega", { ascending: false, nullsFirst: false })
      .order("seleccionado_at", { ascending: false }),
    supabase
      .from("atrasos")
      .select("user_moto_compra_id, dias_atraso, monto_adeudado, estado"),
  ]);

  const atrasoMap = new Map(
    ((atrasos ?? []) as Array<
      AtrasoSnapshot & { user_moto_compra_id: string }
    >).map((a) => [a.user_moto_compra_id, a]),
  );

  return ((data ?? []) as unknown as VendidaMotoRow[]).map((row) => {
    const users = row.users;
    const morososRaw = row.morosos as
      | { estado: MorosoEstado; dias_atraso: number; monto_adeudado?: number }
      | { estado: MorosoEstado; dias_atraso: number; monto_adeudado?: number }[]
      | null;
    const recogerRaw = row.motos_para_recoger as
      | { estado: MotoRecogerEstado; dias_atraso?: number }
      | { estado: MotoRecogerEstado; dias_atraso?: number }[]
      | null;
    const atrasoRaw = atrasoMap.get(row.id);

    return {
      ...row,
      users: Array.isArray(users) ? users[0] : users,
      morosos: Array.isArray(morososRaw) ? morososRaw[0] : morososRaw,
      motos_para_recoger: Array.isArray(recogerRaw)
        ? recogerRaw[0]
        : recogerRaw,
      garaje_motos: row.garaje_motos ?? [],
      atraso: atrasoRaw
        ? {
            dias_atraso: atrasoRaw.dias_atraso,
            monto_adeudado: atrasoRaw.monto_adeudado,
            estado: atrasoRaw.estado as AtrasoSnapshot["estado"],
          }
        : null,
    } satisfies VendidaMotoRow;
  });
}

export async function getAllGarajeParqueaderos(): Promise<GarajeParqueaderoRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("garaje_parqueaderos")
    .select("id, nombre, slug, activo, orden, created_at, updated_at")
    .order("orden")
    .order("nombre");
  return (data as GarajeParqueaderoRow[]) ?? [];
}

export async function getAllGarajeMotos(): Promise<GarajeMotoRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("garaje_motos")
    .select(
      "id, parqueadero_id, placa, placa_foto_url, referencia, modelo, color, origen, condicion, estado, moto_para_recoger_id, user_moto_compra_id, notas, created_at, updated_at, garaje_parqueaderos(nombre)",
    )
    .order("created_at", { ascending: false });

  return ((data ?? []) as unknown as Array<
    Omit<GarajeMotoRow, "parqueadero_nombre"> & {
      garaje_parqueaderos: { nombre: string } | { nombre: string }[] | null;
    }
  >).map((row) => {
    const parq = row.garaje_parqueaderos;
    const parqueaderoNombre = Array.isArray(parq)
      ? (parq[0]?.nombre ?? null)
      : (parq?.nombre ?? null);
    return {
      id: row.id,
      parqueadero_id: row.parqueadero_id,
      parqueadero_nombre: parqueaderoNombre,
      placa: row.placa,
      placa_foto_url: row.placa_foto_url,
      referencia: row.referencia,
      modelo: row.modelo,
      color: row.color,
      origen: row.origen,
      condicion: row.condicion,
      estado: row.estado,
      moto_para_recoger_id: row.moto_para_recoger_id,
      user_moto_compra_id: row.user_moto_compra_id,
      notas: row.notas,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });
}

export async function getFirstPendingUserId(
  queueId: InboxQueueId,
): Promise<number | null> {
  const items = await getInboxListItems(queueId);
  return items[0]?.userId ?? null;
}

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

function setMatchLabel(
  map: Map<number, string>,
  userId: number,
  label: string,
  priority: number,
  priorities: Map<number, number>,
) {
  const current = priorities.get(userId);
  if (current === undefined || priority < current) {
    map.set(userId, label);
    priorities.set(userId, priority);
  }
}

export async function searchClients(
  query: string,
): Promise<ClientSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const supabase = createAdminClient();
  const pattern = `%${escapeIlike(q)}%`;
  const matchLabels = new Map<number, string>();
  const matchPriorities = new Map<number, number>();

  const [
    { data: byPlaca },
    { data: byCedulaHoja },
    { data: byCedulaContrato },
    { data: byVisitaNombre },
    { data: byUser },
    { data: byNombreCompleto },
  ] = await Promise.all([
    supabase.from("user_moto_compra").select("user_id").ilike("placa", pattern),
    supabase
      .from("digital_contracts")
      .select("user_id")
      .filter("hoja_vida_data->>numero_identificacion", "ilike", pattern),
    supabase
      .from("digital_contracts")
      .select("user_id")
      .filter("contrato_data->>cedula_contratante", "ilike", pattern),
    supabase.from("visitas").select("user_id").ilike("cliente_nombre", pattern),
    supabase.from("users").select("id").ilike("user", pattern),
    supabase
      .from("digital_contracts")
      .select("user_id")
      .filter("hoja_vida_data->>nombre_completo", "ilike", pattern),
  ]);

  for (const row of byPlaca ?? []) {
    setMatchLabel(matchLabels, row.user_id as number, "Placa", 0, matchPriorities);
  }
  for (const row of [...(byCedulaHoja ?? []), ...(byCedulaContrato ?? [])]) {
    setMatchLabel(matchLabels, row.user_id as number, "Cédula", 1, matchPriorities);
  }
  for (const row of [...(byVisitaNombre ?? []), ...(byNombreCompleto ?? [])]) {
    setMatchLabel(matchLabels, row.user_id as number, "Nombre", 2, matchPriorities);
  }
  for (const row of byUser ?? []) {
    setMatchLabel(matchLabels, row.id as number, "Usuario", 3, matchPriorities);
  }

  const userIds = [...matchLabels.keys()];
  if (userIds.length === 0) return [];

  const [{ data: users }, { data: paidTarifas }] = await Promise.all([
    supabase
      .from("users")
      .select(
        "id, user, user_moto_compra(modelo, color, placa, estado), visitas(cliente_nombre), digital_contracts(hoja_vida_data, contrato_data, created_at)",
      )
      .in("id", userIds),
    supabase
      .from("tarifas_pagadas")
      .select("user_id")
      .in("user_id", userIds)
      .eq("estado", "pagada"),
  ]);

  const paidCount = new Map<number, number>();
  for (const row of paidTarifas ?? []) {
    const id = row.user_id as number;
    paidCount.set(id, (paidCount.get(id) ?? 0) + 1);
  }

  const results: ClientSearchResult[] = (users ?? []).map((raw) => {
    const user = raw as {
      id: number;
      user: string;
      user_moto_compra:
        | {
            modelo: string;
            color: string;
            placa: string | null;
            estado: ClientSearchResult["compraEstado"];
          }
        | {
            modelo: string;
            color: string;
            placa: string | null;
            estado: ClientSearchResult["compraEstado"];
          }[]
        | null;
      visitas: { cliente_nombre: string | null } | { cliente_nombre: string | null }[] | null;
      digital_contracts:
        | {
            hoja_vida_data: Record<string, unknown>;
            contrato_data: Record<string, unknown>;
            created_at: string;
          }
        | {
            hoja_vida_data: Record<string, unknown>;
            contrato_data: Record<string, unknown>;
            created_at: string;
          }[]
        | null;
    };

    const compraRaw = user.user_moto_compra;
    const compra = Array.isArray(compraRaw) ? compraRaw[0] : compraRaw;

    const visitaRaw = user.visitas;
    const visita = Array.isArray(visitaRaw) ? visitaRaw[0] : visitaRaw;

    const contractsRaw = user.digital_contracts;
    const contracts = Array.isArray(contractsRaw)
      ? contractsRaw
      : contractsRaw
        ? [contractsRaw]
        : [];
    const latestContract = contracts.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];

    const hoja = latestContract?.hoja_vida_data ?? null;
    const contrato = latestContract?.contrato_data ?? null;
    const cedulaFromHoja = hoja?.numero_identificacion as string | undefined;
    const cedulaFromContrato = contrato?.cedula_contratante as string | undefined;
    const cedula =
      cedulaFromHoja?.trim() ||
      cedulaFromContrato?.trim() ||
      null;

    const nombreFromHoja = hoja?.nombre_completo as string | undefined;
    const displayName =
      nombreFromHoja?.trim() ||
      visita?.cliente_nombre?.trim() ||
      user.user;

    return {
      userId: user.id,
      username: user.user,
      displayName,
      cedula,
      placa: compra?.placa ?? null,
      motoLabel: compra ? `${compra.modelo} · ${compra.color}` : null,
      compraEstado: compra?.estado ?? null,
      cuotasPagadas: paidCount.get(user.id) ?? 0,
      matchLabel: matchLabels.get(user.id) ?? "—",
    };
  });

  return results.sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "es"),
  );
}
