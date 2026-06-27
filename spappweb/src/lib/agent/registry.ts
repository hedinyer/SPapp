import "server-only";

import { z } from "zod";

import {
  getActiveVisitadores,
  getAllBikes,
  getAllCategorias,
  getAllGarajeMotos,
  getAllGarajeParqueaderos,
  getAllProductos,
  getAllSolicitudesTaller,
  getAllVendidasMotos,
  getAllVisitadores,
  getClientPipeline,
  getInboxListItems,
  getInboxQueues,
  searchClients,
} from "@/lib/pipeline/queries";
import {
  approveCredit,
  assignVisit,
  cancelCompra,
  cancelVisit,
  completeVisit,
  confirmPayment,
  confirmTarifaPago,
  createClientUser,
  deleteBike,
  deleteCategoria,
  deleteGarajeMoto,
  deleteGarajeParqueadero,
  deleteProducto,
  deleteVendidaMoto,
  deleteVisitador,
  markDelivered,
  markMotoRecogida,
  rejectCredit,
  resolveMoroso,
  saveBike,
  saveCategoria,
  saveGarajeMoto,
  saveGarajeParqueadero,
  saveProducto,
  saveVisitador,
  setTracking,
  updateDelivery,
  updateSolicitudEstado,
  updateVendidaEstadoFisico,
} from "@/lib/actions/admin-actions";
import {
  checkReferenciaPagoUsada,
  confirmPagoConComprobante,
  removePagoAbono,
} from "@/lib/actions/payment-comprobante-actions";
import { submitPublicApplication } from "@/lib/actions/client-actions";
import { hojaVidaFormSchema } from "@/lib/contracts/hoja-vida-schema";

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

export type AgentToolCategory =
  | "lectura"
  | "credito"
  | "visitas"
  | "pagos"
  | "entrega"
  | "mora"
  | "clientes"
  | "catalogo"
  | "inventario"
  | "garaje"
  | "taller";

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
    handler: () => getInboxQueues(),
  }),
  inbox_list: tool({
    category: "lectura",
    description:
      "Lista los clientes/items pendientes de una cola específica de la bandeja.",
    input: z.object({
      queueId: z.enum(INBOX_QUEUE_IDS).describe("Identificador de la cola"),
    }),
    handler: ({ queueId }) => getInboxListItems(queueId),
  }),
  search_clients: tool({
    category: "lectura",
    description:
      "Busca clientes por nombre, cédula, placa o usuario (mínimo 2 caracteres). Devuelve resumen con userId, moto, estado de compra y cuotas pagadas.",
    input: z.object({
      query: z.string().min(2, "Mínimo 2 caracteres"),
    }),
    handler: ({ query }) => searchClients(query),
  }),
  get_client_pipeline: tool({
    category: "lectura",
    description:
      "Vista 360° de un cliente: datos, documento/crédito, contrato, moto comprada, pagos, tarifas, mora, tracking, visita y pasos del pipeline. Úsala antes de cualquier acción sobre el cliente.",
    input: z.object({
      userId: z.number().int().positive(),
    }),
    handler: ({ userId }) => getClientPipeline(userId),
  }),
  list_bikes: tool({
    category: "catalogo",
    description: "Catálogo completo de motos (bike_table).",
    input: empty,
    handler: () => getAllBikes(),
  }),
  list_categorias: tool({
    category: "inventario",
    description: "Categorías de inventario de repuestos.",
    input: empty,
    handler: () => getAllCategorias(),
  }),
  list_productos: tool({
    category: "inventario",
    description: "Productos de inventario (repuestos) con su categoría.",
    input: empty,
    handler: () => getAllProductos(),
  }),
  list_solicitudes_taller: tool({
    category: "taller",
    description: "Solicitudes de taller (repuestos, reparación, cambio de aceite).",
    input: empty,
    handler: () => getAllSolicitudesTaller(),
  }),
  list_visitadores: tool({
    category: "visitas",
    description: "Todos los visitadores registrados.",
    input: empty,
    handler: () => getAllVisitadores(),
  }),
  list_active_visitadores: tool({
    category: "visitas",
    description: "Visitadores activos con usuario, aptos para asignar visitas.",
    input: empty,
    handler: () => getActiveVisitadores(),
  }),
  list_garaje_parqueaderos: tool({
    category: "garaje",
    description: "Parqueaderos del garaje.",
    input: empty,
    handler: () => getAllGarajeParqueaderos(),
  }),
  list_garaje_motos: tool({
    category: "garaje",
    description: "Motos físicas en el garaje (inventario físico/recuperaciones).",
    input: empty,
    handler: () => getAllGarajeMotos(),
  }),
  list_vendidas: tool({
    category: "garaje",
    description: "Motos entregadas (vendidas) con su estado físico y mora.",
    input: empty,
    handler: () => getAllVendidasMotos(),
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
    handler: ({ documentId, userId }) => approveCredit(documentId, userId),
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
    handler: (args) => rejectCredit(args),
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
    handler: (args) => assignVisit(args),
  }),
  complete_visit: tool({
    category: "visitas",
    description: "Marca una visita como completada.",
    input: z.object({
      visitaId: z.string().uuid(),
      userId: z.number().int().positive(),
    }),
    handler: ({ visitaId, userId }) => completeVisit(visitaId, userId),
  }),
  cancel_visit: tool({
    category: "visitas",
    description: "Cancela una visita.",
    input: z.object({
      visitaId: z.string().uuid(),
      userId: z.number().int().positive(),
    }),
    handler: ({ visitaId, userId }) => cancelVisit(visitaId, userId),
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
    handler: (args) => confirmPayment(args),
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
    handler: (args) => confirmTarifaPago(args),
  }),
  register_payment: tool({
    category: "pagos",
    description:
      "Registra un pago confirmado con todos sus datos (sin comprobante adjunto). Contexto: 'tarifa' (requiere tarifaId y comprobante, no soportado por agente), 'inicial' o 'cuota_adelantada'. Para efectivo no se exige comprobante. Aplica validación de referencia única por cliente.",
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
        "nequi_pedro",
        "nequi_marisol",
        "davivienda",
        "efectivo",
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
      return confirmPagoConComprobante(fd);
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
    handler: (args) => checkReferenciaPagoUsada(args),
  }),
  remove_pago_abono: tool({
    category: "pagos",
    description:
      "Elimina un abono del primer pago (contexto inicial o cuota_adelantada) si la compra no está entregada/cancelada.",
    input: z.object({
      pagoId: z.string().uuid(),
      userId: z.number().int().positive(),
    }),
    handler: ({ pagoId, userId }) => removePagoAbono(pagoId, userId),
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
    handler: (args) => updateDelivery(args),
  }),
  mark_delivered: tool({
    category: "entrega",
    description: "Marca la compra como entregada (dispara generación de tarifas).",
    input: z.object({
      compraId: z.string().uuid(),
      userId: z.number().int().positive(),
    }),
    handler: ({ compraId, userId }) => markDelivered(compraId, userId),
  }),
  cancel_compra: tool({
    category: "entrega",
    description: "Cancela una compra de moto.",
    input: z.object({
      compraId: z.string().uuid(),
      userId: z.number().int().positive(),
    }),
    handler: ({ compraId, userId }) => cancelCompra(compraId, userId),
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
    handler: (args) => updateVendidaEstadoFisico(args),
  }),
  delete_vendida_moto: tool({
    category: "entrega",
    description:
      "Elimina una compra entregada y sus motos de garaje asociadas. Acción destructiva.",
    input: z.object({
      compraId: z.string().uuid(),
      userId: z.number().int().positive(),
    }),
    handler: ({ compraId, userId }) => deleteVendidaMoto(compraId, userId),
  }),

  // ---------------------------------------------------------------- MORA / TRACKING
  set_tracking: tool({
    category: "mora",
    description: "Activa o desactiva el seguimiento GPS de un cliente.",
    input: z.object({
      userId: z.number().int().positive(),
      seguimiento: z.boolean(),
    }),
    handler: ({ userId, seguimiento }) => setTracking(userId, seguimiento),
  }),
  resolve_moroso: tool({
    category: "mora",
    description:
      "Regulariza a un cliente moroso. Falla si quedan tarifas vencidas sin pagar.",
    input: z.object({
      morosoId: z.string().uuid(),
      userId: z.number().int().positive(),
    }),
    handler: (args) => resolveMoroso(args),
  }),
  mark_moto_recogida: tool({
    category: "mora",
    description: "Marca una moto en cola de recogida como recogida.",
    input: z.object({
      recogerId: z.string().uuid(),
      userId: z.number().int().positive(),
    }),
    handler: (args) => markMotoRecogida(args),
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
    handler: ({ cedula }) => createClientUser({ cedula }),
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
    handler: (args) => submitPublicApplication(args),
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
    handler: (args) => saveVisitador(args),
  }),
  delete_visitador: tool({
    category: "visitas",
    description: "Elimina un visitador y su usuario asociado.",
    input: z.object({ id: z.number().int().positive() }),
    handler: ({ id }) => deleteVisitador(id),
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
      descripcion: z.string().optional(),
      activo: z.boolean(),
    }),
    handler: (args) => saveBike(args),
  }),
  delete_bike: tool({
    category: "catalogo",
    description: "Elimina una moto del catálogo.",
    input: z.object({ id: z.number().int().positive() }),
    handler: ({ id }) => deleteBike(id),
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
    handler: (args) => saveCategoria(args),
  }),
  delete_categoria: tool({
    category: "inventario",
    description: "Elimina una categoría de inventario.",
    input: z.object({ id: z.number().int().positive() }),
    handler: ({ id }) => deleteCategoria(id),
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
      stock: z.number().int().min(0),
      stockMinimo: z.number().int().min(0),
      imagenUrl: z.string().optional(),
      compatibleModelos: z.array(z.string()).optional(),
      activo: z.boolean(),
    }),
    handler: (args) => saveProducto(args),
  }),
  delete_producto: tool({
    category: "inventario",
    description: "Elimina un producto de inventario.",
    input: z.object({ id: z.number().int().positive() }),
    handler: ({ id }) => deleteProducto(id),
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
    handler: (args) => updateSolicitudEstado(args),
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
    handler: (args) => saveGarajeParqueadero(args),
  }),
  delete_garaje_parqueadero: tool({
    category: "garaje",
    description:
      "Elimina un parqueadero. Falla si hay motos asignadas a él.",
    input: z.object({ id: z.number().int().positive() }),
    handler: ({ id }) => deleteGarajeParqueadero(id),
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
    handler: (args) => saveGarajeMoto(args),
  }),
  delete_garaje_moto: tool({
    category: "garaje",
    description: "Elimina una moto del garaje.",
    input: z.object({ id: z.string().uuid() }),
    handler: ({ id }) => deleteGarajeMoto(id),
  }),
} satisfies Record<string, ToolDef>;

export type AgentToolName = keyof typeof AGENT_TOOLS;

export interface AgentToolSchema {
  name: string;
  category: AgentToolCategory;
  description: string;
  parameters: Record<string, unknown>;
}

/** Catálogo OpenAI/Hermes-compatible (function-calling) generado desde Zod. */
export function getAgentToolCatalog(): AgentToolSchema[] {
  return (Object.keys(AGENT_TOOLS) as AgentToolName[]).map((name) => {
    const def = AGENT_TOOLS[name];
    return {
      name,
      category: def.category,
      description: def.description,
      parameters: z.toJSONSchema(def.input, { target: "draft-7" }) as Record<
        string,
        unknown
      >,
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
