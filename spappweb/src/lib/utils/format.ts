export { formatCop } from "./format-cop";

export function formatDate(date: string | Date | null | undefined): string {  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

/** Fecha calendario (YYYY-MM-DD) sin corrimiento por zona horaria. */
export function formatDateOnly(date: string | Date | null | undefined): string {
  if (!date) return "—";
  if (typeof date === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
    if (m) {
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(d);
    }
  }
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(d);
}

export { formatCuotas } from "@/lib/payments/payment-metrics";
