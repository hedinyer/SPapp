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
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(iso));
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
    lines.push(`Valor venta: ${formatCop(venta.valorVenta)}`);
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

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Venta moto</title>
<style>
@page { size: 80mm auto; margin: 4mm; }
body { font-family: monospace; font-size: 12px; width: 72mm; margin: 0; }
div { white-space: pre-wrap; word-break: break-word; }
</style></head><body>${body}</body></html>`;
}

/** Imprime ticket 80mm vía diálogo del navegador (impresora POS). */
export function printVentaMotoReceipt(venta: VentaMotoRow): Promise<void> {
  return new Promise((resolve, reject) => {
    const html = buildVentaMotoReceiptHtml(venta);
    const iframe = document.createElement("iframe");
    Object.assign(iframe.style, {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "0",
      height: "0",
      border: "0",
    });
    document.body.appendChild(iframe);

    const cleanup = () => iframe.remove();

    iframe.onerror = () => {
      cleanup();
      reject(new Error("No se pudo abrir la impresión."));
    };

    iframe.onload = () => {
      const win = iframe.contentWindow;
      if (!win) {
        cleanup();
        reject(new Error("No se pudo abrir la impresión."));
        return;
      }
      win.onafterprint = () => {
        cleanup();
        resolve();
      };
      win.focus();
      win.print();
      window.setTimeout(() => {
        cleanup();
        resolve();
      }, 120_000);
    };

    iframe.srcdoc = html;
  });
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
}
