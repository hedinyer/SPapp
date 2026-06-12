import type {
  ClientPipeline,
  ContractStatus,
  DigitalContractRow,
  PipelineStep,
  PipelineStepId,
  SolicitudEstado,
  StepVisualState,
  UserDocumentRow,
  UserMotoCompraRow,
  UserRow,
  VisitaEstado,
  VisitaRow,
} from "@/lib/pipeline/types";

const STEP_ORDER: PipelineStepId[] = [
  "credito",
  "contrato",
  "visita",
  "moto",
  "pago",
  "entrega",
];

const STEP_LABELS: Record<PipelineStepId, string> = {
  credito: "Crédito",
  contrato: "Contrato",
  visita: "Visita",
  moto: "Moto",
  pago: "Pago",
  entrega: "Entrega",
};

function creditDone(doc: UserDocumentRow | null): boolean {
  return doc?.estado_solicitud === "aceptada";
}

function creditError(doc: UserDocumentRow | null): boolean {
  return doc?.estado_solicitud === "rechazada";
}

function contractDone(contract: DigitalContractRow | null): boolean {
  return contract?.status === "firmado";
}

function visitDone(visita: VisitaRow | null): boolean {
  return visita?.estado === "completada";
}

function visitError(visita: VisitaRow | null): boolean {
  return visita?.estado === "cancelada";
}

function motoDone(compra: UserMotoCompraRow | null): boolean {
  return compra != null;
}

function paymentDone(compra: UserMotoCompraRow | null): boolean {
  if (!compra) return false;
  return (
    compra.pago_inicial_confirmado &&
    compra.pago_cuota_confirmado &&
    (compra.estado === "lista_retiro" || compra.estado === "entregada")
  );
}

function deliveryDone(compra: UserMotoCompraRow | null): boolean {
  return compra?.estado === "entregada";
}

function deliveryError(compra: UserMotoCompraRow | null): boolean {
  return compra?.estado === "cancelada";
}

function isStepComplete(
  stepId: PipelineStepId,
  doc: UserDocumentRow | null,
  contract: DigitalContractRow | null,
  visita: VisitaRow | null,
  compra: UserMotoCompraRow | null,
): boolean {
  switch (stepId) {
    case "credito":
      return creditDone(doc);
    case "contrato":
      return contractDone(contract);
    case "visita":
      return visitDone(visita);
    case "moto":
      return motoDone(compra);
    case "pago":
      return paymentDone(compra);
    case "entrega":
      return deliveryDone(compra);
    default:
      return false;
  }
}

function isStepError(
  stepId: PipelineStepId,
  doc: UserDocumentRow | null,
  visita: VisitaRow | null,
  compra: UserMotoCompraRow | null,
): boolean {
  switch (stepId) {
    case "credito":
      return creditError(doc);
    case "visita":
      return visitError(visita);
    case "entrega":
      return deliveryError(compra);
    default:
      return false;
  }
}

function isBlockedForStep(
  stepId: PipelineStepId,
  doc: UserDocumentRow | null,
  contract: DigitalContractRow | null,
  visita: VisitaRow | null,
  compra: UserMotoCompraRow | null,
): boolean {
  switch (stepId) {
    case "credito":
      return false;
    case "contrato":
      return !creditDone(doc);
    case "visita":
      return !contractDone(contract);
    case "moto":
      return !visitDone(visita);
    case "pago":
      return !motoDone(compra);
    case "entrega":
      return !paymentDone(compra) && compra?.estado !== "lista_retiro";
    default:
      return true;
  }
}

export function detectAdminActionStep(
  doc: UserDocumentRow | null,
  visita: VisitaRow | null,
  compra: UserMotoCompraRow | null,
): PipelineStepId | null {
  if (doc?.estado_solicitud === "pendiente") return "credito";
  if (
    visita &&
    (visita.estado === "pendiente_asignacion" || visita.estado === "asignada")
  ) {
    return "visita";
  }
  if (
    compra &&
    compra.estado === "pendiente_pago" &&
    (!compra.pago_inicial_confirmado || !compra.pago_cuota_confirmado)
  ) {
    return "pago";
  }
  if (compra && compra.estado === "lista_retiro") {
    return "entrega";
  }
  return null;
}

export function buildPipelineSteps(
  doc: UserDocumentRow | null,
  contract: DigitalContractRow | null,
  visita: VisitaRow | null,
  compra: UserMotoCompraRow | null,
): PipelineStep[] {
  const adminStep = detectAdminActionStep(doc, visita, compra);

  return STEP_ORDER.map((id) => {
    let state: StepVisualState = "pendiente";

    if (isStepError(id, doc, visita, compra)) {
      state = "error";
    } else if (isStepComplete(id, doc, contract, visita, compra)) {
      state = "completado";
    } else if (isBlockedForStep(id, doc, contract, visita, compra)) {
      state = "bloqueado";
    } else if (adminStep === id) {
      state = "actual";
    } else if (id === "moto" && visitDone(visita) && !compra) {
      state = "pendiente";
    }

    return {
      id,
      label: STEP_LABELS[id],
      state,
      adminActionRequired: adminStep === id,
    };
  });
}

export function resolveDisplayName(
  user: UserRow,
  contract: DigitalContractRow | null,
  visita: VisitaRow | null,
): string {
  const hoja = contract?.hoja_vida_data as
    | { nombres?: string; apellidos?: string; nombre?: string }
    | undefined;
  const fromHoja =
    hoja?.nombres && hoja?.apellidos
      ? `${hoja.nombres} ${hoja.apellidos}`.trim()
      : hoja?.nombre?.trim();
  if (fromHoja) return fromHoja;
  if (visita?.cliente_nombre) return visita.cliente_nombre;
  return user.user;
}

export function buildClientPipeline(input: {
  user: UserRow;
  document: UserDocumentRow | null;
  contract: DigitalContractRow | null;
  visita: VisitaRow | null;
  compra: UserMotoCompraRow | null;
  tracking: import("@/lib/pipeline/types").UserTrackingRow | null;
  tarifas?: import("@/lib/pipeline/types").TarifaPagadaRow[];
  moroso?: import("@/lib/pipeline/types").MorosoRow | null;
  recoger?: import("@/lib/pipeline/types").MotoParaRecogerRow | null;
  rentingResumen?: import("@/lib/pipeline/types").RentingResumen | null;
}): ClientPipeline {
  const steps = buildPipelineSteps(
    input.document,
    input.contract,
    input.visita,
    input.compra,
  );

  return {
    ...input,
    tarifas: input.tarifas ?? [],
    moroso: input.moroso ?? null,
    recoger: input.recoger ?? null,
    rentingResumen: input.rentingResumen ?? null,
    steps,
    currentAdminStep: detectAdminActionStep(
      input.document,
      input.visita,
      input.compra,
    ),
    displayName: resolveDisplayName(
      input.user,
      input.contract,
      input.visita,
    ),
  };
}

export function contractStatusLabel(status: ContractStatus | undefined): string {
  switch (status) {
    case "borrador":
      return "Borrador";
    case "completado":
      return "Completado";
    case "firmado":
      return "Firmado";
    default:
      return "Sin contrato";
  }
}

export function solicitudLabel(estado: SolicitudEstado | undefined): string {
  switch (estado) {
    case "pendiente":
      return "En revisión";
    case "aceptada":
      return "Aprobada";
    case "rechazada":
      return "Rechazada";
    default:
      return "Sin solicitud";
  }
}

export function visitaEstadoLabel(estado: VisitaEstado | undefined): string {
  switch (estado) {
    case "pendiente_asignacion":
      return "Sin asignar";
    case "asignada":
      return "Programada";
    case "completada":
      return "Completada";
    case "cancelada":
      return "Cancelada";
    default:
      return "—";
  }
}
