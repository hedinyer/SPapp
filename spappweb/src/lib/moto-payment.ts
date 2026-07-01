import type { BikeRow, FrecuenciaPago } from "@/lib/pipeline/types";

export function montoCuotaPeriodo(
  cuotaDiaria: number,
  frecuencia: FrecuenciaPago,
): number {
  switch (frecuencia) {
    case "diario":
      return cuotaDiaria;
    case "semanal":
      return cuotaDiaria * 7;
    case "quincenal":
      return cuotaDiaria * 15;
    case "mensual":
      return cuotaDiaria * 30;
  }
}

export function calcMotoPayment(bike: BikeRow, frecuencia: FrecuenciaPago) {
  const monto_cuota_periodo = montoCuotaPeriodo(bike.cuota_diaria, frecuencia);
  return {
    cuota_inicial_monto: bike.cuota_inicial,
    monto_cuota_periodo,
    monto_total_primer_pago: bike.cuota_inicial + monto_cuota_periodo,
  };
}

export const FRECUENCIA_PERIOD: Record<FrecuenciaPago, string> = {
  diario: "por día",
  semanal: "7 días · por adelantado",
  quincenal: "15 días · por adelantado",
  mensual: "30 días · por adelantado",
};
