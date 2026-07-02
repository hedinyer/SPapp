import type { VentaMotoRow } from "@/lib/actions/venta-moto-actions";
import { formatCop } from "@/lib/utils/format";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function folio(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function fechaLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Bogota",
    }).format(new Date());
  }
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(d);
}

export function buildVentaMotoReceiptHtml(venta: VentaMotoRow): string {
  const lines: string[] = [
    "SOLUCIONES GARRIDO",
    "Comprobante venta moto",
    `Folio ${folio(venta.id)}`,
    fechaLabel(venta.createdAt),
    "",
    `Cliente: ${venta.clienteNombre}`,
    `Cédula: ${venta.clienteCedula}`,
    `Celular: ${venta.clienteCelular}`,
    "",
    `Moto: ${venta.modelo} ${venta.color}`,
  ];

  if (venta.chasis) lines.push(`Chasis: ${venta.chasis}`);
  if (venta.valorVenta != null) {
    lines.push(`Precio moto: ${formatCop(venta.valorVenta)}`);
    lines.push(`Pagado: ${formatCop(venta.montoPagado)}`);
    const saldo = venta.valorVenta - venta.montoPagado;
    if (saldo > 0) lines.push(`Saldo: ${formatCop(saldo)}`);
    else lines.push("Pago: CONTADO");
  } else if (venta.cuotaInicial != null) {
    lines.push(`Cuota inicial ref.: ${formatCop(venta.cuotaInicial)}`);
  }
  if (venta.notas) lines.push(`Notas: ${venta.notas}`);

  lines.push("", "Gracias por su compra");

  const body = lines.map((l) => `<div>${esc(l)}</div>`).join("");

  // ponytail: sin @page size raro — Chrome lanza "Error interno" al imprimir
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Venta moto</title>
<style>
@media print { body { margin: 0; } }
body { font-family: monospace; font-size: 12px; max-width: 72mm; margin: 8px auto; padding: 4px; }
div { white-space: pre-wrap; word-break: break-word; line-height: 1.35; }
</style></head><body>${body}</body></html>`;
}

function triggerPrint(win: Window): void {
  window.setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      // el usuario imprime con Ctrl+P desde la pestaña abierta
    }
  }, 400);
}

/** Abre el ticket en pestaña nueva e intenta el diálogo de impresión. */
export function printVentaMotoReceipt(venta: VentaMotoRow): void {
  const html = buildVentaMotoReceiptHtml(venta);
  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (popup) {
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    triggerPrint(popup);
    return;
  }

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement("iframe");
  iframe.setAttribute(
    "style",
    "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0",
  );
  iframe.src = url;
  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (win) triggerPrint(win);
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
      iframe.remove();
    }, 120_000);
  };
  document.body.appendChild(iframe);
}

if (typeof process !== "undefined" && process.argv[1]?.includes("venta-moto-receipt")) {
  const sample: VentaMotoRow = {
    id: "00000000-0000-4000-8000-000000000001",
    bikeId: 1,
    modelo: "AKT",
    color: "Rojo",
    placa: null,
    chasis: "CH123",
    clienteNombre: "Juan Pérez",
    clienteCedula: "1234567890",
    clienteCelular: "3001234567",
    cuotaInicial: 500000,
    valorVenta: 5_000_000,
    montoPagado: 2_000_000,
    notas: null,
    createdAt: new Date().toISOString(),
  };
  const html = buildVentaMotoReceiptHtml(sample);
  if (!html.includes("Juan Pérez") || !html.includes("Saldo:")) {
    throw new Error("buildVentaMotoReceiptHtml sample failed");
  }
  if (html.includes("80mm auto")) {
    throw new Error("invalid @page must stay removed");
  }
}
