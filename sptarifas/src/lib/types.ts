export interface Destinatario {
  configuracionId: number;
  cuenta: string;
}

export interface ContratoOpt {
  contratoId: number;
  clienteId: number;
  clienteNombre: string;
  cedula: string;
  tarifa: number;
  frecuencia: string;
}

export interface FacturaView {
  id: number;
  fecha: string;
  total: number;
  saldo: number;
}

export interface PlanRow {
  facturaId: number;
  fecha: string;
  saldoAntes: number;
  aplicar: number;
  queda: number;
}

export interface PreviewResult {
  contratos: ContratoOpt[];
  contratoId: number | null;
  facturas: FacturaView[];
  plan: PlanRow[];
  sobrante: number;
}

export interface PagoAplicado {
  pagoId: number;
  facturaId: number;
  aplicado: number;
  estado: string;
}

export interface RegistrarResult {
  clienteNombre: string;
  contratoId: number;
  pagos: PagoAplicado[];
  sobrante: number;
  prepagoId: number | null;
}
