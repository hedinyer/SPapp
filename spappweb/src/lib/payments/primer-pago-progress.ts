import type { PagoRow, UserMotoCompraRow } from "@/lib/pipeline/types";

export type PrimerPagoConcepto = "inicial" | "cuota_adelantada" | "visita";

export function montoEsperadoConcepto(
  compra: UserMotoCompraRow,
  contexto: PrimerPagoConcepto,
): number {
  if (contexto === "inicial") return compra.cuota_inicial_monto;
  if (contexto === "cuota_adelantada") return compra.monto_cuota_periodo;
  return compra.monto_visita_monto ?? 0;
}

export function abonosPorConcepto(
  pagos: PagoRow[],
  contexto: PrimerPagoConcepto,
): PagoRow[] {
  return pagos.filter(
    (p) => p.contexto_pago === contexto && p.estado === "confirmado",
  );
}

export function sumAbonos(
  pagos: PagoRow[],
  contexto: PrimerPagoConcepto,
): number {
  return abonosPorConcepto(pagos, contexto).reduce((s, p) => s + p.monto, 0);
}

export function faltanteConcepto(
  compra: UserMotoCompraRow,
  pagos: PagoRow[],
  contexto: PrimerPagoConcepto,
): number {
  const esperado = montoEsperadoConcepto(compra, contexto);
  if (esperado <= 0) return 0;
  const recibido = sumAbonos(pagos, contexto);
  return Math.max(0, esperado - recibido);
}

export function conceptoCompleto(
  compra: UserMotoCompraRow,
  pagos: PagoRow[],
  contexto: PrimerPagoConcepto,
): boolean {
  return faltanteConcepto(compra, pagos, contexto) === 0;
}

export function conceptoAplica(compra: UserMotoCompraRow, contexto: PrimerPagoConcepto): boolean {
  return montoEsperadoConcepto(compra, contexto) > 0;
}
