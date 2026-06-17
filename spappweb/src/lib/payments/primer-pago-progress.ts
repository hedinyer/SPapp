import type { PagoRow, UserMotoCompraRow } from "@/lib/pipeline/types";

export type PrimerPagoConcepto = "inicial" | "cuota_adelantada";

export function montoEsperadoConcepto(
  compra: UserMotoCompraRow,
  contexto: PrimerPagoConcepto,
): number {
  return contexto === "inicial"
    ? compra.cuota_inicial_monto
    : compra.monto_cuota_periodo;
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
