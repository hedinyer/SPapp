import { z } from "zod";

import { hojaVidaFormSchema } from "@/lib/contracts/hoja-vida-schema";
import { MONTO_VISITA_DEFAULT } from "@/lib/payments/visita-monto";

/**
 * Cargadores perezosos (dynamic import) de las capas de negocio. Mantienen el
 * módulo del registro y la ruta `/api/agent/tools` libres de dependencias pesadas
 * (Supabase server-only, `sharp`, `tesseract.js`), de modo que el catálogo se
 * pueda generar siempre, incluso en cold-start de Vercel. Cada handler carga su
 * módulo solo cuando se invoca.
 */
const loadQueries = () => import("@/lib/pipeline/queries");
const loadAdminActions = () => import("@/lib/actions/admin-actions");
const loadPaymentActions = () =>
  import("@/lib/actions/payment-comprobante-actions");
const loadClientActions = () => import("@/lib/actions/client-actions");
const loadPipelineEvents = () => import("@/lib/agent/pipeline-events");
const loadVentaMotoActions = () => import("@/lib/actions/venta-moto-actions");
const loadVentaProductoActions = () =>
  import("@/lib/actions/venta-producto-actions");
const loadHistorialMotosActions = () =>
  import("@/lib/actions/historial-motos-actions");
const loadCajaActions = () => import("@/lib/actions/caja-actions");
const loadCreditoOps = () => import("@/lib/actions/credito-operaciones-actions");
const loadContractAdmin = () => import("@/lib/actions/contract-admin-actions");

const INBOX_QUEUE_IDS = [
  "creditos",
  "pagos",
  "retiro",
  "entrega",
  "visitas_sin_asignar",
  "visitas_programadas",
  "morosos",
  "recoger",
  "solicitudes_taller",
] as const;

const MEDIO_PAGO_ADMIN = [
  "nequi_nicolas",
  "davivienda",
  "efectivo",
  "datafono",
] as const;

export type AgentToolCategory =
  | "lectura"
  | "notificaciones"
  | "credito"
  | "contratos"
  | "visitas"
  | "pagos"
  | "entrega"
  | "mora"
  | "clientes"
  | "catalogo"
  | "inventario"
  | "garaje"
  | "taller"
  | "caja"
  | "ventas"
  | "gps";

interface ToolDef<S extends z.ZodTypeAny = z.ZodTypeAny> {
  category: AgentToolCategory;
  description: string;
  input: S;
  handler: (args: z.infer<S>) => Promise<unknown>;
}

function tool<S extends z.ZodTypeAny>(def: ToolDef<S>): ToolDef<S> {
  return def;
}

const empty = z.object({});

/**
 * Registro central de herramientas del agente IA.
 *
 * Cada handler delega en las server actions y queries existentes del panel,
 * que son la única fuente de verdad de la lógica de negocio (validación Zod,
 * guardas de estado, triggers de Supabase). Añadir una entrada aquí la expone
 * automáticamente vía `/api/agent/tools` y al plugin de Hermes.
 */
export const AGENT_TOOLS = {
  // ---------------------------------------------------------------- LECTURA
  inbox_queues: tool({
    category: "lectura",
    description:
      "Devuelve las 9 colas accionables de la bandeja con su conteo: créditos pendientes, pagos por confirmar, retiros, entregas, visitas, morosos, motos para recoger y solicitudes de taller.",
    input: empty,
    handler: async () => (await loadQueries()).getInboxQueues(),
  }),
  inbox_list: tool({
    category: "lectura",
    description:
      "Lista los clientes/items pendientes de una cola específica de la bandeja.",
    input: z.object({
      queueId: z.enum(INBOX_QUEUE_IDS).describe("Identificador de la cola"),
    }),
    handler: async ({ queueId }) => (await loadQueries()).getInboxListItems(queueId),
  }),
  search_clients: tool({
    category: "lectura",
    description:
      "Busca clientes por nombre, cédula, placa o usuario (mínimo 2 caracteres). Devuelve resumen con userId, moto, estado de compra y cuotas pagadas.",
    input: z.object({
      query: z.string().min(2, "Mínimo 2 caracteres"),
    }),
    handler: async ({ query }) => (await loadQueries()).searchClients(query),
  }),
  get_client_pipeline: tool({
    category: "lectura",
    description:
      "Vista 360° de un cliente: datos, documento/crédito, contrato, moto comprada, pagos, tarifas, mora, tracking, visita y pasos del pipeline. Úsala antes de cualquier acción sobre el cliente.",
    input: z.object({
      userId: z.number().int().positive(),
    }),
    handler: async ({ userId }) => (await loadQueries()).getClientPipeline(userId),
  }),
  list_pipeline_events: tool({
    category: "notificaciones",
    description:
      "Cola de eventos del pipeline (crédito→moto→contrato→pago→visita→entrega) pendientes de WhatsApp. Cada evento incluye celular, paso, payload y whatsappHint sugerido. Consulta periódicamente y envía mensajes al cliente.",
    input: z.object({
      limit: z.number().int().min(1).max(200).optional(),
      since: z.string().optional().describe("ISO timestamp; solo eventos posteriores"),
      includeAcked: z
        .boolean()
        .optional()
        .describe("Si true, incluye eventos ya procesados"),
    }),
    handler: async ({ limit, since, includeAcked }) =>
      (await loadPipelineEvents()).listPipelineEvents({
        limit,
        since,
        pendingOnly: !includeAcked,
      }),
  }),
  ack_pipeline_events: tool({
    category: "notificaciones",
    description:
      "Marca eventos del pipeline como procesados tras enviar el WhatsApp al cliente.",
    input: z.object({
      eventIds: z.array(z.string().uuid()).min(1),
      ackedBy: z.string().optional().describe("Identificador del agente, ej. hermes"),
    }),
    handler: async ({ eventIds, ackedBy }) =>
      (await loadPipelineEvents()).ackPipelineEvents(eventIds, ackedBy),
  }),
  list_bikes: tool({
    category: "catalogo",
    description: "Catálogo completo de motos (bike_table).",
    input: empty,
    handler: async () => (await loadQueries()).getAllBikes(),
  }),
  list_categorias: tool({
    category: "inventario",
    description: "Categorías de inventario de repuestos.",
    input: empty,
    handler: async () => (await loadQueries()).getAllCategorias(),
  }),
  list_productos: tool({
    category: "inventario",
    description: "Productos de inventario (repuestos) con su categoría.",
    input: empty,
    handler: async () => (await loadQueries()).getAllProductos(),
  }),
  list_solicitudes_taller: tool({
    category: "taller",
    description: "Solicitudes de taller (repuestos, reparación, cambio de aceite).",
    input: empty,
    handler: async () => (await loadQueries()).getAllSolicitudesTaller(),
  }),
  list_visitadores: tool({
    category: "visitas",
    description: "Todos los visitadores registrados.",
    input: empty,
    handler: async () => (await loadQueries()).getAllVisitadores(),
  }),
  list_active_visitadores: tool({
    category: "visitas",
    description: "Visitadores activos con usuario, aptos para asignar visitas.",
    input: empty,
    handler: async () => (await loadQueries()).getActiveVisitadores(),
  }),
  list_garaje_parqueaderos: tool({
    category: "garaje",
    description: "Parqueaderos del garaje.",
    input: empty,
    handler: async () => (await loadQueries()).getAllGarajeParqueaderos(),
  }),
  list_garaje_motos: tool({
    category: "garaje",
    description: "Motos físicas en el garaje (inventario físico/recuperaciones).",
    input: empty,
    handler: async () => (await loadQueries()).getAllGarajeMotos(),
  }),
  list_vendidas: tool({
    category: "garaje",
    description:
      "Motos de crédito/renting entregadas (en calle) con estado físico y mora. NO son ventas de contado de mostrador — para contado usa list_ventas_contado.",
    input: empty,
    handler: async () => (await loadQueries()).getAllVendidasMotos(),
  }),
  list_ventas_contado: tool({
    category: "lectura",
    description:
      "Ventas de motos al contado / abono en mostrador (tabla ventas_moto, ruta /venta-contado). Incluye cliente, modelo, color, placa, valorVenta, montoPagado y saldo. Distinto de list_vendidas (crédito).",
    input: z.object({
      query: z
        .string()
        .optional()
        .describe("Filtro opcional por nombre, cédula, placa, celular o modelo"),
      limit: z.number().int().min(1).max(200).optional(),
    }),
    handler: async ({ query, limit }) => {
      const rows = await (await loadVentaMotoActions()).getVentasContado();
      const q = query?.trim().toLowerCase();
      const filtered = q
        ? rows.filter((r) =>
            [r.clienteNombre, r.clienteCedula, r.clienteCelular, r.placa, r.modelo, r.color]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q)),
          )
        : rows;
      return filtered.slice(0, limit ?? 100).map((r) => ({
        ...r,
        saldo:
          r.valorVenta != null
            ? Math.max(0, r.valorVenta - r.montoPagado)
            : null,
        estadoPago:
          r.valorVenta != null && r.montoPagado >= r.valorVenta
            ? "contado"
            : r.montoPagado > 0
              ? "abono"
              : "sin_pago",
      }));
    },
  }),
  list_ventas_producto: tool({
    category: "lectura",
    description:
      "Ventas de productos/repuestos de tienda (tabla ventas_producto, rutas /venta, /caja, /historial-ventas). Incluye ítems, total y montoPagado.",
    input: z.object({
      query: z
        .string()
        .optional()
        .describe("Filtro opcional por nombre, cédula o celular del cliente"),
      limit: z.number().int().min(1).max(200).optional(),
    }),
    handler: async ({ query, limit }) => {
      const rows = await (
        await loadVentaProductoActions()
      ).listVentasProductoHistorial(limit ?? 100);
      const q = query?.trim().toLowerCase();
      if (!q) return rows;
      return rows.filter((r) =>
        [r.clienteNombre, r.clienteCedula, r.clienteCelular]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      );
    },
  }),
  list_motos_credito_liquidado: tool({
    category: "lectura",
    description:
      "Motos de crédito ya saldadas (historial; no son contado de mostrador). Complementa list_ventas_contado y list_vendidas.",
    input: empty,
    handler: async () =>
      (await loadHistorialMotosActions()).listHistorialMotosCredito(),
  }),
  get_caja_hoy: tool({
    category: "caja",
    description:
      "Sesión de caja de hoy (America/Bogota): apertura/cierre, movimientos, egresos e informe de recaudos (efectivo/Nequi/Davivienda, ventas tienda, pagos crédito). Null si aún no se abrió caja.",
    input: empty,
    handler: async () => (await loadCajaActions()).getCajaSesionHoy(),
  }),

  // ---------------------------------------------------------------- CRÉDITO
  approve_credit: tool({
    category: "credito",
    description:
      "Aprueba la solicitud de crédito de un cliente (users_documents → aceptada).",
    input: z.object({
      documentId: z.number().int().positive(),
      userId: z.number().int().positive(),
    }),
    handler: async ({ documentId, userId }) =>
      (await loadAdminActions()).approveCredit(documentId, userId),
  }),
  reject_credit: tool({
    category: "credito",
    description:
      "Rechaza una solicitud de crédito con motivo. Si betado=true, el cliente queda vetado de reenviar.",
    input: z.object({
      documentId: z.number().int().positive(),
      userId: z.number().int().positive(),
      motivo: z.string().min(3),
      betado: z.boolean(),
    }),
    handler: async (args) => (await loadAdminActions()).rejectCredit(args),
  }),

  // ---------------------------------------------------------------- VISITAS
  assign_visit: tool({
    category: "visitas",
    description:
      "Asigna un visitador y fecha a una visita domiciliaria (estado → asignada).",
    input: z.object({
      visitaId: z.string().uuid(),
      userId: z.number().int().positive(),
      visitadorId: z.number().int().positive(),
      fechaProgramada: z
        .string()
        .min(1)
        .describe("Fecha/hora ISO 8601 de la visita"),
    }),
    handler: async (args) => (await loadAdminActions()).assignVisit(args),
  }),
  complete_visit: tool({
    category: "visitas",
    description: "Marca una visita como completada.",
    input: z.object({
      visitaId: z.string().uuid(),
      userId: z.number().int().positive(),
    }),
    handler: async ({ visitaId, userId }) =>
      (await loadAdminActions()).completeVisit(visitaId, userId),
  }),
  cancel_visit: tool({
    category: "visitas",
    description: "Cancela una visita.",
    input: z.object({
      visitaId: z.string().uuid(),
      userId: z.number().int().positive(),
    }),
    handler: async ({ visitaId, userId }) =>
      (await loadAdminActions()).cancelVisit(visitaId, userId),
  }),

  // ---------------------------------------------------------------- PAGOS
  confirm_payment_flag: tool({
    category: "pagos",
    description:
      "Marca/desmarca la confirmación del pago inicial o de la cuota de una compra (flags pago_inicial_confirmado / pago_cuota_confirmado).",
    input: z.object({
      compraId: z.string().uuid(),
      userId: z.number().int().positive(),
      field: z.enum(["inicial", "cuota"]),
      value: z.boolean(),
    }),
    handler: async (args) => (await loadAdminActions()).confirmPayment(args),
  }),
  confirm_tarifa_pago: tool({
    category: "pagos",
    description:
      "Confirma el pago de una tarifa/cuota de renting (tarifas_pagadas → pagada con monto esperado).",
    input: z.object({
      tarifaId: z.string().uuid(),
      userId: z.number().int().positive(),
      notas: z.string().optional(),
    }),
    handler: async (args) => (await loadAdminActions()).confirmTarifaPago(args),
  }),
  register_payment: tool({
    category: "pagos",
    description:
      "Registra un pago confirmado con todos sus datos (sin comprobante adjunto). Contexto: 'tarifa' (requiere tarifaId y comprobante, no soportado por agente), 'inicial' o 'cuota_adelantada'. Aplica validación de referencia única por cliente.",
    input: z.object({
      userId: z.number().int().positive(),
      compraId: z.string().uuid(),
      contexto: z.enum(["tarifa", "inicial", "cuota_adelantada"]),
      tarifaId: z.string().uuid().optional(),
      referencia: z.string().optional(),
      monto: z.number().int().positive(),
      fechaComprobante: z.string().optional().describe("ISO 8601"),
      medioPagoAdmin: z.enum([
        "nequi_nicolas",
        "davivienda",
        "efectivo",
        "datafono",
      ]),
      bancoOrigen: z.enum(["nequi", "davivienda", "otro"]),
      entradaManual: z.boolean().default(true),
      notas: z.string().optional(),
    }),
    handler: async (args) => {
      const fd = new FormData();
      fd.set("userId", String(args.userId));
      fd.set("compraId", args.compraId);
      fd.set("contexto", args.contexto);
      if (args.tarifaId) fd.set("tarifaId", args.tarifaId);
      if (args.referencia) fd.set("referencia", args.referencia);
      fd.set("monto", String(args.monto));
      if (args.fechaComprobante) fd.set("fechaComprobante", args.fechaComprobante);
      fd.set("medioPagoAdmin", args.medioPagoAdmin);
      fd.set("bancoOrigen", args.bancoOrigen);
      fd.set("entradaManual", String(args.entradaManual));
      if (args.notas) fd.set("notas", args.notas);
      return (await loadPaymentActions()).confirmPagoConComprobante(fd);
    },
  }),
  check_referencia_usada: tool({
    category: "pagos",
    description:
      "Verifica si una referencia de pago ya fue usada por un cliente (anti-duplicado).",
    input: z.object({
      userId: z.number().int().positive(),
      referencia: z.string().min(1),
    }),
    handler: async (args) =>
      (await loadPaymentActions()).checkReferenciaPagoUsada(args),
  }),
  remove_pago_abono: tool({
    category: "pagos",
    description:
      "Elimina un abono del primer pago (contexto inicial o cuota_adelantada) si la compra no está entregada/cancelada.",
    input: z.object({
      pagoId: z.string().uuid(),
      userId: z.number().int().positive(),
    }),
    handler: async ({ pagoId, userId }) =>
      (await loadPaymentActions()).removePagoAbono(pagoId, userId),
  }),

  // ---------------------------------------------------------------- ENTREGA
  update_delivery: tool({
    category: "entrega",
    description:
      "Registra los datos de entrega de la moto (placa, chasis, referencia, fecha de entrega).",
    input: z.object({
      compraId: z.string().uuid(),
      userId: z.number().int().positive(),
      placa: z.string().min(1),
      chasis: z.string().min(1),
      referencia: z.string().optional(),
      fechaEntrega: z.string().min(1).describe("Fecha ISO/date de entrega"),
    }),
    handler: async (args) => (await loadAdminActions()).updateDelivery(args),
  }),
  mark_delivered: tool({
    category: "entrega",
    description: "Marca la compra como entregada (dispara generación de tarifas).",
    input: z.object({
      compraId: z.string().uuid(),
      userId: z.number().int().positive(),
    }),
    handler: async ({ compraId, userId }) =>
      (await loadAdminActions()).markDelivered(compraId, userId),
  }),
  cancel_compra: tool({
    category: "entrega",
    description: "Cancela una compra de moto.",
    input: z.object({
      compraId: z.string().uuid(),
      userId: z.number().int().positive(),
    }),
    handler: async ({ compraId, userId }) =>
      (await loadAdminActions()).cancelCompra(compraId, userId),
  }),
  update_vendida_estado_fisico: tool({
    category: "entrega",
    description:
      "Actualiza el estado físico de una moto ya entregada (activa, recogida, robada, en_transito, en_patio).",
    input: z.object({
      compraId: z.string().uuid(),
      userId: z.number().int().positive(),
      estadoFisico: z.enum([
        "activa",
        "recogida",
        "robada",
        "en_transito",
        "en_patio",
      ]),
    }),
    handler: async (args) =>
      (await loadAdminActions()).updateVendidaEstadoFisico(args),
  }),
  delete_vendida_moto: tool({
    category: "entrega",
    description:
      "Elimina una compra entregada y sus motos de garaje asociadas. Acción destructiva.",
    input: z.object({
      compraId: z.string().uuid(),
      userId: z.number().int().positive(),
    }),
    handler: async ({ compraId, userId }) =>
      (await loadAdminActions()).deleteVendidaMoto(compraId, userId),
  }),

  // ---------------------------------------------------------------- MORA / TRACKING
  set_tracking: tool({
    category: "mora",
    description: "Activa o desactiva el seguimiento GPS de un cliente.",
    input: z.object({
      userId: z.number().int().positive(),
      seguimiento: z.boolean(),
    }),
    handler: async ({ userId, seguimiento }) =>
      (await loadAdminActions()).setTracking(userId, seguimiento),
  }),
  resolve_moroso: tool({
    category: "mora",
    description:
      "Regulariza a un cliente moroso. Falla si quedan tarifas vencidas sin pagar.",
    input: z.object({
      morosoId: z.string().uuid(),
      userId: z.number().int().positive(),
    }),
    handler: async (args) => (await loadAdminActions()).resolveMoroso(args),
  }),
  mark_moto_recogida: tool({
    category: "mora",
    description: "Marca una moto en cola de recogida como recogida.",
    input: z.object({
      recogerId: z.string().uuid(),
      userId: z.number().int().positive(),
    }),
    handler: async (args) => (await loadAdminActions()).markMotoRecogida(args),
  }),

  // ---------------------------------------------------------------- CLIENTES
  create_client: tool({
    category: "clientes",
    description:
      "Crea un usuario cliente por cédula (usuario=cédula, password=cédula, status normal).",
    input: z.object({
      cedula: z
        .string()
        .min(5)
        .max(15)
        .regex(/^\d+$/, "Solo dígitos"),
    }),
    handler: async ({ cedula }) =>
      (await loadAdminActions()).createClientUser({ cedula }),
  }),
  submit_public_application: tool({
    category: "clientes",
    description:
      "Envía una solicitud pública de crédito (documentos + hoja de vida). Requiere URLs ya subidas a Storage de cédula frente/reverso y selfie, más la hoja de vida completa.",
    input: z.object({
      documentFrontUrl: z.string().url(),
      documentBackUrl: z.string().url(),
      selfieUrl: z.string().url(),
      hojaVida: hojaVidaFormSchema,
    }),
    handler: async (args) =>
      (await loadClientActions()).submitPublicApplication(args),
  }),

  // ---------------------------------------------------------------- VISITADORES (CRUD)
  save_visitador: tool({
    category: "visitas",
    description:
      "Crea o edita un visitador. Al crear (sin id) se requieren username y password; se genera su usuario con status visitador.",
    input: z.object({
      id: z.number().int().positive().optional(),
      nombre: z.string().min(2),
      telefono: z.string().optional(),
      fotoUrl: z.string().optional(),
      activo: z.boolean(),
      username: z.string().min(3).optional(),
      password: z.string().min(4).optional(),
    }),
    handler: async (args) => (await loadAdminActions()).saveVisitador(args),
  }),
  delete_visitador: tool({
    category: "visitas",
    description: "Elimina un visitador y su usuario asociado.",
    input: z.object({ id: z.number().int().positive() }),
    handler: async ({ id }) => (await loadAdminActions()).deleteVisitador(id),
  }),

  // ---------------------------------------------------------------- CATÁLOGO (CRUD)
  save_bike: tool({
    category: "catalogo",
    description: "Crea o edita una moto del catálogo (bike_table).",
    input: z.object({
      id: z.number().int().positive().optional(),
      modelo: z.string().min(1),
      color: z.string().min(1),
      imagenUrl: z.string().optional(),
      stock: z.number().int().min(0),
      cuotaInicial: z.number().int().min(0),
      cuotaDiaria: z.number().int().min(0),
      montoVisita: z.number().int().min(0).default(MONTO_VISITA_DEFAULT),
      precioVenta: z.number().int().positive().optional().nullable(),
      descripcion: z.string().optional(),
      activo: z.boolean(),
    }),
    handler: async (args) => (await loadAdminActions()).saveBike(args),
  }),
  delete_bike: tool({
    category: "catalogo",
    description: "Elimina una moto del catálogo.",
    input: z.object({ id: z.number().int().positive() }),
    handler: async ({ id }) => (await loadAdminActions()).deleteBike(id),
  }),

  // ---------------------------------------------------------------- INVENTARIO (CRUD)
  save_categoria: tool({
    category: "inventario",
    description: "Crea o edita una categoría de inventario.",
    input: z.object({
      id: z.number().int().positive().optional(),
      nombre: z.string().min(1),
      slug: z.string().min(1),
      descripcion: z.string().optional(),
      activo: z.boolean(),
      orden: z.number().int().min(0),
    }),
    handler: async (args) => (await loadAdminActions()).saveCategoria(args),
  }),
  delete_categoria: tool({
    category: "inventario",
    description: "Elimina una categoría de inventario.",
    input: z.object({ id: z.number().int().positive() }),
    handler: async ({ id }) => (await loadAdminActions()).deleteCategoria(id),
  }),
  save_producto: tool({
    category: "inventario",
    description: "Crea o edita un producto/repuesto de inventario.",
    input: z.object({
      id: z.number().int().positive().optional(),
      categoriaId: z.number().int().positive(),
      sku: z.string().min(1),
      nombre: z.string().min(1),
      descripcion: z.string().optional(),
      precio: z.number().int().min(0),
      costo: z.number().int().min(0),
      stock: z.number().int().min(0),
      stockMinimo: z.number().int().min(0),
      imagenUrl: z.string().optional(),
      compatibleModelos: z.array(z.string()).optional(),
      activo: z.boolean(),
    }),
    handler: async (args) => (await loadAdminActions()).saveProducto(args),
  }),
  delete_producto: tool({
    category: "inventario",
    description: "Elimina un producto de inventario.",
    input: z.object({ id: z.number().int().positive() }),
    handler: async ({ id }) => (await loadAdminActions()).deleteProducto(id),
  }),

  // ---------------------------------------------------------------- TALLER
  update_solicitud_estado: tool({
    category: "taller",
    description:
      "Cambia el estado de una solicitud de taller y opcionalmente sus notas admin.",
    input: z.object({
      solicitudId: z.string().uuid(),
      estado: z.enum(["pendiente", "en_proceso", "completada", "cancelada"]),
      notasAdmin: z.string().optional(),
    }),
    handler: async (args) =>
      (await loadAdminActions()).updateSolicitudEstado(args),
  }),

  // ---------------------------------------------------------------- GARAJE (CRUD)
  save_garaje_parqueadero: tool({
    category: "garaje",
    description: "Crea o edita un parqueadero del garaje.",
    input: z.object({
      id: z.number().int().positive().optional(),
      nombre: z.string().min(1),
      slug: z.string().min(1),
      activo: z.boolean(),
      orden: z.number().int().min(0),
    }),
    handler: async (args) =>
      (await loadAdminActions()).saveGarajeParqueadero(args),
  }),
  delete_garaje_parqueadero: tool({
    category: "garaje",
    description:
      "Elimina un parqueadero. Falla si hay motos asignadas a él.",
    input: z.object({ id: z.number().int().positive() }),
    handler: async ({ id }) =>
      (await loadAdminActions()).deleteGarajeParqueadero(id),
  }),
  save_garaje_moto: tool({
    category: "garaje",
    description:
      "Crea o edita una moto física del garaje. Para registros manuales nuevos la foto de placa es obligatoria.",
    input: z.object({
      id: z.string().uuid().optional(),
      parqueaderoId: z.number().int().positive().nullable(),
      placa: z.string().optional(),
      placaFotoUrl: z.string().optional(),
      referencia: z.string().min(1),
      modelo: z.string().min(1),
      color: z.string().min(1),
      origen: z.enum(["manual", "recuperacion"]),
      condicion: z.enum(["nueva", "segunda_mano", "recuperada"]),
      estado: z.enum(["en_garaje", "disponible", "vendida", "baja"]),
      notas: z.string().optional(),
      isNewManual: z.boolean().optional(),
    }),
    handler: async (args) => (await loadAdminActions()).saveGarajeMoto(args),
  }),
  delete_garaje_moto: tool({
    category: "garaje",
    description: "Elimina una moto del garaje.",
    input: z.object({ id: z.string().uuid() }),
    handler: async ({ id }) => (await loadAdminActions()).deleteGarajeMoto(id),
  }),
  liberar_garaje_moto: tool({
    category: "garaje",
    description:
      "Libera una moto retenida en garaje para reventa (plazo de recuperación vencido).",
    input: z.object({ garajeMotoId: z.string().uuid() }),
    handler: async (args) =>
      (await loadAdminActions()).liberarGarajeMotoParaVenta(args),
  }),
  devolver_garaje_moto: tool({
    category: "garaje",
    description:
      "Devuelve al cliente una moto retenida en garaje (p.ej. tras pagar parte de la deuda).",
    input: z.object({ garajeMotoId: z.string().uuid() }),
    handler: async (args) =>
      (await loadAdminActions()).devolverGarajeMotoAlCliente(args),
  }),
  list_garaje_mantenimiento: tool({
    category: "garaje",
    description: "Lista ítems de mantenimiento (repuestos) de una moto en garaje.",
    input: z.object({ garajeMotoId: z.string().uuid() }),
    handler: async ({ garajeMotoId }) =>
      (await loadQueries()).getGarajeMantenimientoItems(garajeMotoId),
  }),
  add_garaje_mantenimiento: tool({
    category: "garaje",
    description:
      "Agrega un repuesto de inventario al mantenimiento de una moto (descuenta stock).",
    input: z.object({
      garajeMotoId: z.string().uuid(),
      productoId: z.number().int().positive(),
      cantidad: z.number().int().positive(),
      notas: z.string().optional(),
    }),
    handler: async (args) =>
      (await loadAdminActions()).addGarajeMantenimientoItem(args),
  }),
  remove_garaje_mantenimiento: tool({
    category: "garaje",
    description: "Quita un ítem de mantenimiento y devuelve stock al inventario.",
    input: z.object({ itemId: z.string().uuid() }),
    handler: async ({ itemId }) =>
      (await loadAdminActions()).removeGarajeMantenimientoItem(itemId),
  }),
  terminar_garaje_mantenimiento: tool({
    category: "garaje",
    description:
      "Termina mantenimiento: moto pasa a disponible con cuotas de reventa.",
    input: z.object({
      garajeMotoId: z.string().uuid(),
      cuotaInicial: z.number().int().positive(),
      cuotaDiaria: z.number().int().positive(),
      montoVisita: z.number().int().nonnegative().optional(),
    }),
    handler: async (args) =>
      (await loadAdminActions()).terminarGarajeMantenimiento(args),
  }),

  // ---------------------------------------------------------------- ASIGNACIÓN MOTO / ENTREGA EXTRA
  assign_moto: tool({
    category: "entrega",
    description:
      "Asigna moto del catálogo a un cliente con crédito aprobado (crea/actualiza user_moto_compra; con placa+chasis prepara contrato).",
    input: z.object({
      userId: z.number().int().positive(),
      documentId: z.number().int().positive(),
      bikeId: z.number().int().positive(),
      frecuencia: z.enum(["diario", "semanal", "quincenal", "mensual"]),
      chasis: z.string().trim().min(1),
      placa: z.string().trim().optional(),
      referencia: z.string().trim().optional(),
      cuotaInicial: z.number().int().min(0).optional(),
      cuotaDiaria: z.number().int().positive().optional(),
      montoVisita: z.number().int().min(0).optional(),
    }),
    handler: async (args) => (await loadAdminActions()).assignMotoByAdmin(args),
  }),
  set_entrega_antes_visita: tool({
    category: "entrega",
    description:
      "Define si la entrega de moto puede ir antes de la visita domiciliaria.",
    input: z.object({
      compraId: z.string().uuid(),
      userId: z.number().int().positive(),
      entregaAntesVisita: z.boolean(),
    }),
    handler: async ({ compraId, userId, entregaAntesVisita }) =>
      (await loadAdminActions()).setEntregaAntesVisita(
        compraId,
        userId,
        entregaAntesVisita,
      ),
  }),
  update_frecuencia_pago: tool({
    category: "pagos",
    description:
      "Cambia la frecuencia de pago de la compra (solo antes de haber pagos / pendiente). Actualiza montos de cuota; no regenera PDF.",
    input: z.object({
      userId: z.number().int().positive(),
      compraId: z.string().uuid(),
      frecuencia: z.enum(["diario", "semanal", "quincenal", "mensual"]),
    }),
    handler: async (args) =>
      (await loadPaymentActions()).updateFrecuenciaPagoCompra(args),
  }),
  update_monto_visita: tool({
    category: "pagos",
    description: "Actualiza el monto de visita de la compra (pre-entrega).",
    input: z.object({
      userId: z.number().int().positive(),
      compraId: z.string().uuid(),
      montoVisita: z.number().int().min(0),
    }),
    handler: async (args) =>
      (await loadPaymentActions()).updateMontoVisitaCompra(args),
  }),
  update_compra_montos: tool({
    category: "pagos",
    description:
      "Ajusta cuota inicial y/o monto de cuota periodo en compra pendiente_pago; sincroniza contrato_data/admin_data.",
    input: z.object({
      userId: z.number().int().positive(),
      compraId: z.string().uuid(),
      cuotaInicial: z.number().int().min(0).optional(),
      montoCuotaPeriodo: z.number().int().positive().optional(),
    }),
    handler: async (args) =>
      (await loadContractAdmin()).updateCompraMontos(args),
  }),
  update_tarifa: tool({
    category: "pagos",
    description:
      "Edita monto_esperado y/o fecha_vencimiento de una tarifa pendiente/vencida (no pagada).",
    input: z.object({
      tarifaId: z.string().uuid(),
      userId: z.number().int().positive(),
      montoEsperado: z.number().int().positive().optional(),
      fechaVencimiento: z.string().min(1).optional(),
    }),
    handler: async (args) => (await loadContractAdmin()).updateTarifa(args),
  }),

  // ---------------------------------------------------------------- CRÉDITO OPS
  congelar_cuotas: tool({
    category: "credito",
    description:
      "Congela cuotas de una compra entregada: corre fechas de vencimiento N días (RPC congelar_cuotas_compra).",
    input: z.object({
      userId: z.number().int().positive(),
      compraId: z.string().uuid(),
      dias: z.number().int().min(1).max(365),
      observaciones: z.string().max(2000).optional(),
    }),
    handler: async (args) => (await loadCreditoOps()).congelarCuotas(args),
  }),
  saldar_credito: tool({
    category: "credito",
    description:
      "Liquida el crédito: marca tarifas pendientes como pagadas y compra saldada. Sin foto: usa medio efectivo/datafono. Con Nequi/Davivienda el agente no puede adjuntar imagen (usa presencial o UI).",
    input: z.object({
      userId: z.number().int().positive(),
      compraId: z.string().uuid(),
      monto: z.number().int().positive(),
      medioPagoAdmin: z.enum(MEDIO_PAGO_ADMIN),
      referencia: z.string().optional(),
      notas: z.string().optional(),
      fechaComprobante: z.string().optional(),
    }),
    handler: async (args) => {
      const fd = new FormData();
      fd.set("userId", String(args.userId));
      fd.set("compraId", args.compraId);
      fd.set("monto", String(args.monto));
      fd.set("medioPagoAdmin", args.medioPagoAdmin);
      if (args.referencia) fd.set("referencia", args.referencia);
      if (args.notas) fd.set("notas", args.notas);
      if (args.fechaComprobante) fd.set("fechaComprobante", args.fechaComprobante);
      return (await loadCreditoOps()).saldarCredito(fd);
    },
  }),

  // ---------------------------------------------------------------- PRODUCTOS A CRÉDITO
  list_productos_credito: tool({
    category: "catalogo",
    description: "Lista el catálogo de productos/accesorios a crédito.",
    input: empty,
    handler: async () => (await loadQueries()).getAllProductosCredito(),
  }),
  save_producto_credito: tool({
    category: "catalogo",
    description: "Crea o edita un producto del catálogo a crédito (accesorios).",
    input: z.object({
      id: z.number().int().positive().optional(),
      nombre: z.string().min(1),
      descripcion: z.string().optional(),
      cuotaInicial: z.number().int().min(0),
      cuotaDiaria: z.number().int().positive(),
      imagenUrl: z.string().optional(),
      activo: z.boolean(),
      orden: z.number().int().min(0),
    }),
    handler: async (args) =>
      (await loadAdminActions()).saveProductoCredito(args),
  }),
  delete_producto_credito: tool({
    category: "catalogo",
    description: "Elimina un producto del catálogo a crédito.",
    input: z.object({ id: z.number().int().positive() }),
    handler: async ({ id }) =>
      (await loadAdminActions()).deleteProductoCredito(id),
  }),
  add_compra_producto_credito: tool({
    category: "credito",
    description:
      "Agrega un accesorio a crédito a una compra en pendiente_pago (por catálogo o montos manuales).",
    input: z.object({
      compraId: z.string().uuid(),
      userId: z.number().int().positive(),
      productoCreditoId: z.number().int().positive().optional(),
      nombre: z.string().trim().min(1).optional(),
      cuotaInicial: z.number().int().min(0).optional(),
      cuotaDiaria: z.number().int().positive().optional(),
      cantidad: z.number().int().positive().default(1),
      notas: z.string().trim().optional(),
    }),
    handler: async (args) =>
      (await loadAdminActions()).addCompraProductoCredito(args),
  }),
  remove_compra_producto_credito: tool({
    category: "credito",
    description: "Quita un ítem de producto a crédito de una compra.",
    input: z.object({
      itemId: z.string().uuid(),
      userId: z.number().int().positive(),
    }),
    handler: async ({ itemId, userId }) =>
      (await loadAdminActions()).removeCompraProductoCredito(itemId, userId),
  }),

  // ---------------------------------------------------------------- CONTRATOS / PDF
  get_contract_detail: tool({
    category: "contratos",
    description:
      "Detalle de un digital_contract: datos, overrides de duración/periodos/total, URLs públicas de PDF/firma.",
    input: z.object({ contractId: z.string().uuid() }),
    handler: async ({ contractId }) =>
      (await loadContractAdmin()).getContractDetail(contractId),
  }),
  update_contract_terms: tool({
    category: "contratos",
    description:
      "Modifica términos del contrato (duración texto, num_periodos, total, placa/chasis/cuotas/frecuencia). Opcional regeneratePdf=true si ya está firmado.",
    input: z.object({
      contractId: z.string().uuid(),
      userId: z.number().int().positive(),
      duracionTexto: z.string().trim().min(1).optional(),
      numPeriodos: z.number().int().positive().max(2000).optional(),
      totalContrato: z.string().trim().min(1).optional(),
      motoPlaca: z.string().trim().optional(),
      motoChasis: z.string().trim().optional(),
      motoModelo: z.string().trim().optional(),
      motoColor: z.string().trim().optional(),
      frecuenciaPago: z
        .enum(["diario", "semanal", "quincenal", "mensual"])
        .optional(),
      cuotaInicial: z.number().int().min(0).optional(),
      valorCuota: z.number().int().positive().optional(),
      regeneratePdf: z.boolean().optional(),
    }),
    handler: async (args) =>
      (await loadContractAdmin()).updateContractTerms(args),
  }),
  sync_contract_from_compra: tool({
    category: "contratos",
    description:
      "Copia placa, montos y frecuencia desde user_moto_compra hacia contrato_data/admin_data. regeneratePdf opcional.",
    input: z.object({
      contractId: z.string().uuid(),
      userId: z.number().int().positive(),
      regeneratePdf: z.boolean().optional(),
    }),
    handler: async (args) =>
      (await loadContractAdmin()).syncContractFromCompra(args),
  }),
  regenerate_contract_pdf: tool({
    category: "contratos",
    description:
      "Regenera el PDF del contrato firmado en Storage (misma firma). Honra overrides duracion_texto, num_periodos, total_contrato.",
    input: z.object({
      contractId: z.string().uuid(),
      userId: z.number().int().positive().optional(),
    }),
    handler: async (args) =>
      (await loadContractAdmin()).regenerateContractPdf(args),
  }),

  // ---------------------------------------------------------------- CAJA
  abrir_caja: tool({
    category: "caja",
    description: "Abre la sesión de caja del día (America/Bogota) con efectivo inicial.",
    input: z.object({
      montoApertura: z.number().int().positive(),
      notas: z.string().trim().optional(),
    }),
    handler: async (args) => (await loadCajaActions()).abrirCaja(args),
  }),
  cerrar_caja: tool({
    category: "caja",
    description: "Cierra la sesión de caja con el conteo de efectivo.",
    input: z.object({
      sesionId: z.string().uuid(),
      montoCierre: z.number().int().nonnegative(),
      notas: z.string().trim().optional(),
    }),
    handler: async (args) => (await loadCajaActions()).cerrarCaja(args),
  }),
  registrar_movimiento_caja: tool({
    category: "caja",
    description: "Registra entrada o salida manual en la caja abierta.",
    input: z.object({
      sesionId: z.string().uuid(),
      tipo: z.enum(["entrada", "salida"]),
      monto: z.number().int().positive(),
      concepto: z.string().trim().min(1),
    }),
    handler: async (args) =>
      (await loadCajaActions()).registrarMovimientoCaja(args),
  }),
  registrar_egreso_caja: tool({
    category: "caja",
    description: "Registra un egreso/pago desde la caja abierta (efectivo/Nequi/Davivienda).",
    input: z.object({
      sesionId: z.string().uuid(),
      concepto: z.string().trim().min(1),
      monto: z.number().int().positive(),
      medioPago: z.enum(["efectivo", "nequi", "davivienda"]),
      beneficiario: z.string().trim().optional(),
      notas: z.string().trim().optional(),
    }),
    handler: async (args) =>
      (await loadCajaActions()).registrarEgresoCaja(args),
  }),

  // ---------------------------------------------------------------- VENTAS CONTADO
  save_venta_moto: tool({
    category: "ventas",
    description: "Registra una venta de moto al contado/abono desde catálogo.",
    input: z.object({
      bikeId: z.number().int().positive(),
      modelo: z.string().trim().min(1),
      color: z.string().trim().min(1),
      clienteNombre: z.string().trim().min(1),
      clienteCedula: z.string().trim().min(5),
      clienteCelular: z.string().trim().min(10),
      chasis: z.string().trim().optional(),
      cuotaInicial: z.number().int().nonnegative().optional(),
      valorVenta: z.number().int().positive().optional(),
      montoPagado: z.number().int().nonnegative().optional(),
      notas: z.string().trim().optional(),
    }),
    handler: async (args) => (await loadVentaMotoActions()).saveVentaMoto(args),
  }),
  set_placa_venta_moto: tool({
    category: "ventas",
    description: "Asigna/actualiza la placa de una venta de moto al contado.",
    input: z.object({
      id: z.string().uuid(),
      placa: z.string().trim().min(1),
    }),
    handler: async ({ id, placa }) =>
      (await loadVentaMotoActions()).setPlacaVentaMoto(id, placa),
  }),
  add_abono_venta_moto: tool({
    category: "ventas",
    description: "Registra un abono adicional sobre una venta de moto al contado.",
    input: z.object({
      id: z.string().uuid(),
      monto: z.number().int().positive(),
    }),
    handler: async ({ id, monto }) =>
      (await loadVentaMotoActions()).addAbonoVentaMoto(id, monto),
  }),
  save_venta_producto: tool({
    category: "ventas",
    description:
      "Registra una venta de productos/repuestos de inventario (descuento de stock).",
    input: z.object({
      clienteNombre: z.string().trim().min(1),
      clienteCelular: z.string().trim().min(10),
      clienteCedula: z.string().trim().optional(),
      montoPagado: z.number().int().nonnegative().optional(),
      notas: z.string().trim().optional(),
      items: z
        .array(
          z.object({
            productoId: z.number().int().positive(),
            cantidad: z.number().int().positive(),
          }),
        )
        .min(1),
    }),
    handler: async (args) =>
      (await loadVentaProductoActions()).saveVentaProducto(args),
  }),
  lookup_producto_sku: tool({
    category: "inventario",
    description: "Busca un producto activo de inventario por SKU exacto.",
    input: z.object({ sku: z.string().trim().min(1) }),
    handler: async ({ sku }) => (await loadQueries()).getProductoBySku(sku),
  }),

  // ---------------------------------------------------------------- GPS
  get_gps_live: tool({
    category: "gps",
    description:
      "Ubicación GPS en vivo de la moto del cliente. Valida que la placa pertenezca al userId.",
    input: z.object({
      userId: z.number().int().positive(),
      placa: z.string().trim().min(1),
      gpsMoto: z.string().optional(),
      deviceId: z.number().int().positive().optional(),
      imei: z.string().trim().optional(),
    }),
    handler: async (args) => {
      await (await import("@/lib/auth/session")).requireAdminSession();
      const { placaPerteneceAlCliente } = await import(
        "@/lib/gps/placaDelCliente"
      );
      if (!(await placaPerteneceAlCliente(args.userId, args.placa))) {
        throw new Error("La placa no pertenece a este cliente.");
      }
      const { buscarUbicacionGpsEnVivo, mensajeGpsNoDisponible } = await import(
        "@/lib/gps/gpsMoto"
      );
      const resultado = await buscarUbicacionGpsEnVivo(args.placa, {
        gpsMoto: args.gpsMoto,
        deviceId: args.deviceId,
        imei: args.imei,
      });
      if (!resultado.ok) {
        return {
          gps: null,
          mensaje: mensajeGpsNoDisponible(
            args.placa,
            resultado.motivo,
            args.gpsMoto,
          ),
        };
      }
      return { gps: resultado.gps, actualizadoEn: new Date().toISOString() };
    },
  }),
  gps_comando_motor: tool({
    category: "gps",
    description:
      "Envía comando de motor GPS (bloquear/desbloquear). Valida placa↔cliente.",
    input: z.object({
      userId: z.number().int().positive(),
      placa: z.string().trim().min(1),
      accion: z.enum(["bloquear", "desbloquear", "apagar", "prender", "encender"]),
      gpsMoto: z.string().optional(),
    }),
    handler: async (args) => {
      await (await import("@/lib/auth/session")).requireAdminSession();
      const { placaPerteneceAlCliente } = await import(
        "@/lib/gps/placaDelCliente"
      );
      if (!(await placaPerteneceAlCliente(args.userId, args.placa))) {
        throw new Error("La placa no pertenece a este cliente.");
      }
      const accion =
        args.accion === "bloquear" || args.accion === "apagar"
          ? ("bloquear" as const)
          : ("desbloquear" as const);
      const { enviarComandoMotor } = await import("@/lib/gps/gpsMoto");
      const resultado = await enviarComandoMotor(
        args.placa,
        accion,
        args.gpsMoto,
      );
      if (!resultado.ok) throw new Error(resultado.error);
      return { ok: true, mensaje: resultado.mensaje };
    },
  }),
} satisfies Record<string, ToolDef>;

export type AgentToolName = keyof typeof AGENT_TOOLS;

export interface AgentToolSchema {
  name: string;
  category: AgentToolCategory;
  description: string;
  parameters: Record<string, unknown>;
}

function safeJsonSchema(input: z.ZodTypeAny): Record<string, unknown> {
  try {
    return z.toJSONSchema(input, { target: "draft-7" }) as Record<string, unknown>;
  } catch {
    return { type: "object", properties: {}, additionalProperties: true };
  }
}

/** Catálogo OpenAI/Hermes-compatible (function-calling) generado desde Zod. */
export function getAgentToolCatalog(): AgentToolSchema[] {
  return (Object.keys(AGENT_TOOLS) as AgentToolName[]).map((name) => {
    const def = AGENT_TOOLS[name];
    return {
      name,
      category: def.category,
      description: def.description,
      parameters: safeJsonSchema(def.input),
    };
  });
}

export interface DispatchResult {
  ok: boolean;
  result?: unknown;
  error?: string;
}

/** Valida los argumentos y ejecuta la herramienta indicada. */
export async function dispatchAgentTool(
  name: string,
  args: unknown,
): Promise<DispatchResult> {
  const def = (AGENT_TOOLS as Record<string, ToolDef | undefined>)[name];
  if (!def) {
    return { ok: false, error: `Herramienta desconocida: ${name}` };
  }

  const parsed = def.input.safeParse(args ?? {});
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`)
      .join("; ");
    return { ok: false, error: `Argumentos inválidos: ${issues}` };
  }

  try {
    const result = await def.handler(parsed.data);
    return { ok: true, result };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error al ejecutar la herramienta.",
    };
  }
}
