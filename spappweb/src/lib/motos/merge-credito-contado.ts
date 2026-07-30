import { normalizarPlaca } from "@/lib/gps/placaGps";
import type { GarajeCondicion } from "@/lib/pipeline/types";

export type TipoVentaMoto = "credito" | "contado" | "credito_a_contado";

export type MotoVendidaMergeInput = {
  id: string;
  tipoVenta: "credito" | "contado";
  selfieUrl: string | null;
  placa: string | null;
  referencia: string | null;
  modelo: string;
  color: string;
  condicion: GarajeCondicion | null;
  fechaVenta: string;
  clienteNombre: string;
  clienteCedula: string | null;
  userId: number | null;
};

export type MotoVendidaMerged = Omit<MotoVendidaMergeInput, "tipoVenta" | "clienteCedula"> & {
  tipoVenta: TipoVentaMoto;
};

/**
 * Si la misma moto aparece en crédito y en contado (placa o cédula+modelo),
 * queda una sola fila marcada crédito → contado.
 */
export function mergeCreditoLuegoContado(
  creditos: MotoVendidaMergeInput[],
  contados: MotoVendidaMergeInput[],
): MotoVendidaMerged[] {
  const usedContado = new Set<string>();
  const contadoByPlaca = new Map<string, MotoVendidaMergeInput>();
  const contadoByCedulaModelo = new Map<string, MotoVendidaMergeInput>();

  for (const c of contados) {
    const placa = c.placa ? normalizarPlaca(c.placa) : "";
    if (placa) contadoByPlaca.set(placa, c);
    const ced = (c.clienteCedula ?? "").trim();
    if (ced) {
      contadoByCedulaModelo.set(`${ced}|${normModelo(c.modelo)}`, c);
    }
  }

  const out: MotoVendidaMerged[] = [];

  for (const cred of creditos) {
    const placa = cred.placa ? normalizarPlaca(cred.placa) : "";
    const byPlaca = placa ? contadoByPlaca.get(placa) : undefined;
    const ced = (cred.clienteCedula ?? "").trim();
    const byCed =
      !byPlaca && ced
        ? contadoByCedulaModelo.get(`${ced}|${normModelo(cred.modelo)}`)
        : undefined;
    const match = byPlaca ?? byCed;

    if (match && !usedContado.has(match.id)) {
      usedContado.add(match.id);
      out.push({
        id: cred.id,
        tipoVenta: "credito_a_contado",
        selfieUrl: cred.selfieUrl ?? match.selfieUrl,
        placa: cred.placa ?? match.placa,
        referencia: cred.referencia ?? match.referencia,
        modelo: cred.modelo,
        color: cred.color,
        condicion: cred.condicion ?? match.condicion,
        fechaVenta: match.fechaVenta,
        clienteNombre: match.clienteNombre || cred.clienteNombre,
        userId: cred.userId,
      });
    } else {
      out.push(stripCedula(cred));
    }
  }

  for (const c of contados) {
    if (!usedContado.has(c.id)) out.push(stripCedula(c));
  }

  out.sort(
    (a, b) =>
      new Date(b.fechaVenta).getTime() - new Date(a.fechaVenta).getTime(),
  );
  return out;
}

function normModelo(modelo: string): string {
  return modelo.trim().toLowerCase().replace(/\s+/g, " ");
}

function stripCedula(row: MotoVendidaMergeInput): MotoVendidaMerged {
  return {
    id: row.id,
    tipoVenta: row.tipoVenta,
    selfieUrl: row.selfieUrl,
    placa: row.placa,
    referencia: row.referencia,
    modelo: row.modelo,
    color: row.color,
    condicion: row.condicion,
    fechaVenta: row.fechaVenta,
    clienteNombre: row.clienteNombre,
    userId: row.userId,
  };
}
