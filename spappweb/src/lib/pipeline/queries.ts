import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { buildClientPipeline } from "@/lib/pipeline/step-logic";
import type {
  BikeRow,
  ClientPipeline,
  DigitalContractRow,
  InboxListItem,
  InboxQueue,
  InboxQueueId,
  InventarioCategoriaRow,
  InventarioProductoRow,
  MorosoRow,
  MotoParaRecogerRow,
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
      "id, user_id, estado_solicitud, betado, motivo_rechazo, document_front_url, document_back_url, selfie_url, hora_actualizacion, created_at",
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
      "id, user_id, digital_contract_id, visitador_id, estado, cliente_nombre, cliente_celular, direccion_visita, barrio, fecha_programada, notas, created_at, updated_at, visitadores(id, nombre, foto_url, telefono, activo)",
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

  const tarifaRows = (tarifas as TarifaPagadaRow[]) ?? [];
  const rentingResumen = buildRentingResumen(
    compra as UserMotoCompraRow | null,
    tarifaRows,
  );

  return buildClientPipeline({
    user: user as UserRow,
    document: (document as UserDocumentRow | null) ?? null,
    contract: (contract as DigitalContractRow | null) ?? null,
    visita: (visita as VisitaRow | null) ?? null,
    compra: (compra as UserMotoCompraRow | null) ?? null,
    tracking: (tracking as UserTrackingRow | null) ?? null,
    tarifas: tarifaRows,
    moroso: (moroso as MorosoRow | null) ?? null,
    recoger: (recoger as MotoParaRecogerRow | null) ?? null,
    rentingResumen,
  });
}

function buildRentingResumen(
  compra: UserMotoCompraRow | null,
  tarifas: TarifaPagadaRow[],
): RentingResumen | null {
  if (!compra || compra.estado !== "entregada") return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalPagado = compra.pago_inicial_confirmado
    ? compra.cuota_inicial_monto
    : 0;
  let totalAdeudado = 0;
  let cuotasPagadas = 0;
  let cuotasPendientes = 0;
  let cuotasVencidas = 0;
  let diasAtraso: number | null = null;
  let proximoVencimiento: string | null = null;

  for (const tarifa of tarifas) {
    if (tarifa.estado === "pagada") {
      cuotasPagadas++;
      totalPagado += tarifa.monto_pagado ?? tarifa.monto_esperado;
    } else if (tarifa.estado === "pendiente") {
      cuotasPendientes++;
      if (!proximoVencimiento) proximoVencimiento = tarifa.fecha_vencimiento;
    } else if (tarifa.estado === "vencida") {
      cuotasVencidas++;
      totalAdeudado += tarifa.monto_esperado;
      const venc = new Date(tarifa.fecha_vencimiento);
      venc.setHours(0, 0, 0, 0);
      const atraso = Math.floor(
        (today.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diasAtraso === null || atraso > diasAtraso) diasAtraso = atraso;
    }
  }

  return {
    totalPagado,
    totalAdeudado,
    cuotasPagadas,
    cuotasPendientes,
    cuotasVencidas,
    diasAtraso,
    proximoVencimiento,
  };
}

export async function getInboxQueues(): Promise<InboxQueue[]> {
  const supabase = createAdminClient();

  const [
    creditos,
    visitasSinAsignar,
    visitasProgramadas,
    pagos,
    retiro,
    entrega,
    morosos,
    recoger,
    solicitudesTaller,
  ] = await Promise.all([
    supabase
      .from("users_documents")
      .select("id", { count: "exact", head: true })
      .eq("estado_solicitud", "pendiente"),
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
      .eq("estado", "activo"),
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
      description: "Créditos pendientes de aprobación",
      count: creditos.count ?? 0,
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
      id: "morosos",
      label: "Clientes en mora",
      description: "Atraso de 3+ días en tarifas",
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
      const { data } = await supabase
        .from("users_documents")
        .select("user_id, created_at, users(id, user)")
        .eq("estado_solicitud", "pendiente")
        .order("created_at", { ascending: true });

      return (data ?? []).map((row) => {
        const users = joinUser(row.users);
        return {
          userId: row.user_id as number,
          username: users?.user ?? `#${row.user_id}`,
          displayName: users?.user ?? `Cliente ${row.user_id}`,
          subtitle: "Solicitud de crédito pendiente",
          queueId,
        };
      });
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
          subtitle: `${compra?.modelo ?? "Moto"} · ${row.dias_atraso} días · ${compra?.placa ?? "sin placa"}`,
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
          subtitle: `Recoger ${compra?.modelo ?? "moto"} · ${row.dias_atraso} días mora`,
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
    .select("id, nombre, foto_url, telefono, activo")
    .eq("activo", true)
    .order("nombre");
  return (data as VisitadorRow[]) ?? [];
}

export async function getAllVisitadores(): Promise<VisitadorRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("visitadores")
    .select("id, nombre, foto_url, telefono, activo")
    .order("nombre");
  return (data as VisitadorRow[]) ?? [];
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

export async function getFirstPendingUserId(
  queueId: InboxQueueId,
): Promise<number | null> {
  const items = await getInboxListItems(queueId);
  return items[0]?.userId ?? null;
}
