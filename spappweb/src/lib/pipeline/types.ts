export type SolicitudEstado = "pendiente" | "aceptada" | "rechazada";
export type ContractStatus = "borrador" | "completado" | "firmado";
export type VisitaEstado =
  | "pendiente_asignacion"
  | "asignada"
  | "completada"
  | "cancelada";
export type MotoCompraEstado =
  | "pendiente_pago"
  | "lista_retiro"
  | "entregada"
  | "cancelada";
export type FrecuenciaPago = "diario" | "semanal" | "quincenal" | "mensual";
export type TarifaEstado = "pendiente" | "pagada" | "vencida";
export type MorosoEstado = "activo" | "regularizado";
export type MotoRecogerEstado =
  | "pendiente"
  | "asignada"
  | "recogida"
  | "cancelada";

export type PipelineStepId =
  | "credito"
  | "contrato"
  | "visita"
  | "moto"
  | "pago"
  | "entrega";

export type StepVisualState =
  | "completado"
  | "actual"
  | "pendiente"
  | "bloqueado"
  | "error";

export interface PipelineStep {
  id: PipelineStepId;
  label: string;
  state: StepVisualState;
  adminActionRequired: boolean;
}

export interface UserRow {
  id: number;
  user: string;
}

export interface UserDocumentRow {
  id: number;
  user_id: number;
  estado_solicitud: SolicitudEstado;
  betado: boolean;
  motivo_rechazo: string | null;
  document_front_url: string | null;
  document_back_url: string | null;
  selfie_url: string | null;
  hora_actualizacion: string | null;
  created_at: string;
}

export interface DigitalContractRow {
  id: string;
  user_id: number;
  users_documents_id: number | null;
  status: ContractStatus;
  hoja_vida_data: Record<string, unknown>;
  contrato_data: Record<string, unknown>;
  admin_data: Record<string, unknown>;
  signature_path: string | null;
  hoja_vida_pdf_path: string | null;
  contrato_pdf_path: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitaEvidenciaFoto {
  url: string;
  captured_at: string;
}

export interface VisitaEvidenciaVideo {
  url: string;
  captured_at: string;
  duration_sec?: number;
}

export interface VisitaUbicacionVerificada {
  lat: number;
  lng: number;
  accuracy?: number;
  captured_at: string;
}

export interface VisitadorRow {
  id: number;
  nombre: string;
  foto_url: string | null;
  telefono: string | null;
  activo: boolean;
  user_id: number | null;
  users?: { id: number; user: string } | { id: number; user: string }[] | null;
}

export interface VisitaRow {
  id: string;
  user_id: number;
  digital_contract_id: string | null;
  visitador_id: number | null;
  estado: VisitaEstado;
  cliente_nombre: string | null;
  cliente_celular: string | null;
  direccion_visita: string | null;
  barrio: string | null;
  fecha_programada: string | null;
  notas: string | null;
  evidencia_fotos: VisitaEvidenciaFoto[];
  evidencia_videos: VisitaEvidenciaVideo[];
  ubicacion_verificada: VisitaUbicacionVerificada | null;
  fecha_completada: string | null;
  notas_visita: string | null;
  visitadores: VisitadorRow | null;
  created_at: string;
  updated_at: string;
}

export interface UserMotoCompraRow {
  id: string;
  user_id: number;
  bike_id: number;
  modelo: string;
  color: string;
  frecuencia_pago: FrecuenciaPago;
  cuota_inicial_monto: number;
  monto_cuota_periodo: number;
  monto_total_primer_pago: number;
  estado: MotoCompraEstado;
  pago_inicial_confirmado: boolean;
  pago_cuota_confirmado: boolean;
  placa: string | null;
  chasis: string | null;
  referencia: string | null;
  fecha_entrega: string | null;
  seleccionado_at: string;
}

export interface TrackingLocation {
  lat?: number;
  lng?: number;
  accuracy?: number;
  captured_at?: string;
}

export interface UserTrackingRow {
  id: number;
  user_id: number;
  seguimiento: boolean;
  ubicacion_1?: TrackingLocation | null;
}

export interface TarifaPagadaRow {
  id: string;
  user_moto_compra_id: string;
  user_id: number;
  numero_periodo: number;
  fecha_vencimiento: string;
  monto_esperado: number;
  monto_pagado: number | null;
  estado: TarifaEstado;
  pagada_at: string | null;
  confirmada_por: string | null;
  notas: string | null;
}

export interface MorosoRow {
  id: string;
  user_moto_compra_id: string;
  user_id: number;
  tarifa_vencida_id: string | null;
  dias_atraso: number;
  monto_adeudado: number;
  estado: MorosoEstado;
  fecha_ingreso: string;
}

export interface MotoParaRecogerRow {
  id: string;
  user_moto_compra_id: string;
  moroso_id: string | null;
  user_id: number;
  dias_atraso: number;
  monto_adeudado: number;
  estado: MotoRecogerEstado;
  fecha_ingreso: string;
  fecha_recogida: string | null;
  notas: string | null;
}

export interface RentingResumen {
  totalPagado: number;
  totalAdeudado: number;
  cuotasPagadas: number;
  cuotasPendientes: number;
  cuotasVencidas: number;
  diasAtraso: number | null;
  proximoVencimiento: string | null;
}

export interface ClientPipeline {
  user: UserRow;
  document: UserDocumentRow | null;
  contract: DigitalContractRow | null;
  visita: VisitaRow | null;
  compra: UserMotoCompraRow | null;
  tracking: UserTrackingRow | null;
  tarifas: TarifaPagadaRow[];
  moroso: MorosoRow | null;
  recoger: MotoParaRecogerRow | null;
  rentingResumen: RentingResumen | null;
  steps: PipelineStep[];
  currentAdminStep: PipelineStepId | null;
  displayName: string;
}

export type InboxQueueId =
  | "creditos"
  | "visitas_sin_asignar"
  | "visitas_programadas"
  | "pagos"
  | "retiro"
  | "entrega"
  | "morosos"
  | "recoger"
  | "solicitudes_taller";

export interface InboxQueue {
  id: InboxQueueId;
  label: string;
  description: string;
  count: number;
}

export interface InboxListItem {
  userId: number;
  username: string;
  displayName: string;
  subtitle: string;
  queueId: InboxQueueId;
}

export interface ClientSearchResult {
  userId: number;
  username: string;
  displayName: string;
  cedula: string | null;
  placa: string | null;
  motoLabel: string | null;
  compraEstado: MotoCompraEstado | null;
  cuotasPagadas: number;
  matchLabel: string;
}

export interface BikeRow {
  id: number;
  modelo: string;
  color: string;
  imagen_url: string | null;
  stock: number;
  cuota_inicial: number;
  cuota_diaria: number;
  descripcion: string | null;
  activo: boolean;
}

export const FRECUENCIA_LABELS: Record<FrecuenciaPago, string> = {
  diario: "Diario",
  semanal: "Semanal",
  quincenal: "Quincenal",
  mensual: "Mensual",
};

export const VISITA_ESTADO_LABELS: Record<VisitaEstado, string> = {
  pendiente_asignacion: "Sin asignar",
  asignada: "Programada",
  completada: "Completada",
  cancelada: "Cancelada",
};

export const COMPRA_ESTADO_LABELS: Record<MotoCompraEstado, string> = {
  pendiente_pago: "Pendiente de pago",
  lista_retiro: "Lista para retiro",
  entregada: "Entregada",
  cancelada: "Cancelada",
};

export const TARIFA_ESTADO_LABELS: Record<TarifaEstado, string> = {
  pendiente: "Pendiente",
  pagada: "Pagada",
  vencida: "Vencida",
};

export type SolicitudTallerTipo = "repuestos" | "reparacion" | "cambio_aceite";
export type SolicitudTallerEstado =
  | "pendiente"
  | "en_proceso"
  | "completada"
  | "cancelada";

export interface InventarioCategoriaRow {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string | null;
  activo: boolean;
  orden: number;
}

export interface InventarioProductoRow {
  id: number;
  categoria_id: number;
  sku: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  stock: number;
  stock_minimo: number;
  imagen_url: string | null;
  compatible_modelos: string[];
  activo: boolean;
  inventario_categorias?: InventarioCategoriaRow | null;
}

export interface SolicitudRepuestoItemRow {
  id: string;
  solicitud_id: string;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  inventario_productos?: InventarioProductoRow | null;
}

export interface SolicitudTallerRow {
  id: string;
  user_id: number;
  user_moto_compra_id: string | null;
  tipo: SolicitudTallerTipo;
  estado: SolicitudTallerEstado;
  notas_cliente: string | null;
  notas_admin: string | null;
  fecha_preferida: string | null;
  descripcion_falla: string | null;
  total_estimado: number;
  created_at: string;
  updated_at: string;
  users?: UserRow | null;
  user_moto_compra?: UserMotoCompraRow | null;
  solicitud_repuesto_items?: SolicitudRepuestoItemRow[];
}

export const SOLICITUD_TIPO_LABELS: Record<SolicitudTallerTipo, string> = {
  repuestos: "Repuestos",
  reparacion: "Reparación",
  cambio_aceite: "Cambio de aceite",
};

export const SOLICITUD_ESTADO_LABELS: Record<SolicitudTallerEstado, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  completada: "Completada",
  cancelada: "Cancelada",
};
