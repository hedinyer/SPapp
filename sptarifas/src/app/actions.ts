"use server";

import { z } from "zod";
import { query, withTx } from "@/lib/db";
import { ocrReceipt } from "@/lib/ocr";
import { planFifo, type FacturaPendiente } from "@/lib/fifo";
import {
  SQL_FACTURAS_PENDIENTES,
  ensureFacturasParaMonto,
  facturasConEmisionSimulada,
  mapFacturaRows,
} from "@/lib/factura-tarifa";
import type {
  ContratoOpt,
  Destinatario,
  FacturaView,
  PagoAplicado,
  PreviewResult,
  RegistrarResult,
} from "@/lib/types";

const MEDIO_NEQUI = "Transfer Nequi";
// La tabla terminal_pagos_prepago esta vacia y el modelo Django no esta en el repo.
// ponytail: se asume 'disponible'; cambiar aqui si el backend usa otro valor.
const ESTADO_PREPAGO = "disponible";

const toInt = (v: unknown): number => Math.round(Number(v));

const SQL_DESTINATARIOS = `
  SELECT cfg.id AS configuracion_id, ct.nombre AS cuenta
  FROM terminal_pagos_configuracionpago cfg
  JOIN terminal_pagos_mediopago m ON m.id = cfg.medio_id
  JOIN terminal_pagos_cuenta ct ON ct.id = cfg.cuenta_destino_id
  WHERE m.nombre = $1 AND cfg.activo = true
  ORDER BY cfg.id;
`;

const SQL_CANAL_NEQUI = `
  SELECT cp.id
  FROM terminal_pagos_canalpago cp
  JOIN terminal_pagos_mediopago m ON m.id = cp.medio_id
  WHERE m.nombre = $1 AND cp.activo = true
  ORDER BY cp.id
  LIMIT 1;
`;

const SQL_CONTRATOS = `
  SELECT c.id AS contrato_id, cl.id AS cliente_id, cl.nombre, cl.cedula,
         c.tarifa, c.frecuencia_pago
  FROM arrendamientos_contrato c
  JOIN vehiculos_vehiculo v ON v.id = c.vehiculo_id
  JOIN clientes_cliente cl ON cl.id = c.cliente_id
  WHERE upper(v.placa) = upper($1)
  ORDER BY c.id DESC;
`;

const SQL_FACTURAS = SQL_FACTURAS_PENDIENTES;

async function fetchContratos(placa: string): Promise<ContratoOpt[]> {
  const rows = await query(SQL_CONTRATOS, [placa.trim()]);
  return rows.map((r) => ({
    contratoId: Number(r.contrato_id),
    clienteId: Number(r.cliente_id),
    clienteNombre: String(r.nombre),
    cedula: String(r.cedula),
    tarifa: toInt(r.tarifa),
    frecuencia: String(r.frecuencia_pago),
  }));
}

async function fetchFacturas(contratoId: number): Promise<FacturaPendiente[]> {
  const rows = await query(SQL_FACTURAS, [contratoId]);
  return mapFacturaRows(rows);
}

function isoHoyBogota(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(
    new Date(),
  );
}

export async function getDestinatarios(): Promise<Destinatario[]> {
  const rows = await query(SQL_DESTINATARIOS, [MEDIO_NEQUI]);
  return rows.map((r) => ({
    configuracionId: Number(r.configuracion_id),
    cuenta: String(r.cuenta),
  }));
}

export async function ocrComprobante(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Selecciona la imagen del comprobante.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("La imagen no puede superar 8 MB.");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await ocrReceipt(buffer);
  return {
    referencia: result.referencia,
    monto: result.monto,
    fechaComprobante: result.fechaComprobante,
    bancoDetectado: result.bancoDetectado,
    confidence: result.confidence,
  };
}

const previewSchema = z.object({
  placa: z.string().trim().min(1, "Escribe la placa."),
  monto: z.number().int().nonnegative(),
  contratoId: z.number().int().optional(),
  fechaPago: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function previewPagoTarifa(input: {
  placa: string;
  monto: number;
  contratoId?: number;
  fechaPago?: string;
}): Promise<PreviewResult> {
  const data = previewSchema.parse(input);
  const fechaPago = data.fechaPago ?? isoHoyBogota();

  const contratos = await fetchContratos(data.placa);
  if (contratos.length === 0) {
    throw new Error(`No hay contrato para la placa ${data.placa.toUpperCase()}.`);
  }

  let contrato: ContratoOpt | undefined;
  if (data.contratoId) {
    contrato = contratos.find((c) => c.contratoId === data.contratoId);
  }
  if (!contrato && contratos.length === 1) {
    contrato = contratos[0];
  }

  if (!contrato) {
    // Varios contratos: el usuario debe elegir uno.
    return { contratos, contratoId: null, facturas: [], plan: [], sobrante: 0 };
  }

  const existentes = await fetchFacturas(contrato.contratoId);
  const facturas =
    data.monto > 0
      ? await facturasConEmisionSimulada(
          (text, params) =>
            query(text, params).then((rows) => ({ rows: rows as Record<string, unknown>[] })),
          contrato.contratoId,
          contrato.tarifa,
          fechaPago,
          data.monto,
          existentes,
        )
      : existentes;
  const facturasView: FacturaView[] = facturas.map((f) => ({
    id: f.id,
    fecha: f.fecha,
    total: f.total,
    saldo: f.saldo,
  }));

  const { plan, sobrante } =
    data.monto > 0 ? planFifo(facturas, data.monto) : { plan: [], sobrante: 0 };

  return {
    contratos,
    contratoId: contrato.contratoId,
    facturas: facturasView,
    plan: plan.map((a) => ({
      facturaId: a.facturaId,
      fecha: a.fecha,
      saldoAntes: a.saldoAntes,
      aplicar: a.aplicar,
      queda: a.saldoAntes - a.aplicar,
    })),
    sobrante,
  };
}

const registrarSchema = z.object({
  placa: z.string().trim().min(1, "Escribe la placa."),
  contratoId: z.number().int().optional(),
  monto: z.number().int().positive("El monto debe ser mayor que cero."),
  referencia: z.string().trim().min(1, "Ingresa la referencia."),
  fechaPago: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha invalida (YYYY-MM-DD)."),
  configuracionId: z.number().int(),
});

export async function registrarPagoTarifa(input: {
  placa: string;
  contratoId?: number;
  monto: number;
  referencia: string;
  fechaPago: string;
  configuracionId: number;
}): Promise<RegistrarResult> {
  const data = registrarSchema.parse(input);

  return withTx(async (client) => {
    // Canal Nequi
    const canalRows = (await client.query(SQL_CANAL_NEQUI, [MEDIO_NEQUI])).rows;
    if (canalRows.length === 0) {
      throw new Error("No hay un canal activo para Transfer Nequi.");
    }
    const canalId = Number(canalRows[0].id);

    // Destinatario valido (debe ser una cuenta Nequi activa)
    const destRows = (
      await client.query(
        `SELECT 1
         FROM terminal_pagos_configuracionpago cfg
         JOIN terminal_pagos_mediopago m ON m.id = cfg.medio_id
         WHERE m.nombre = $1 AND cfg.activo = true AND cfg.id = $2
         LIMIT 1;`,
        [MEDIO_NEQUI, data.configuracionId],
      )
    ).rows;
    if (destRows.length === 0) {
      throw new Error("Destinatario invalido.");
    }

    // Contrato por placa
    const contratoRows = (await client.query(SQL_CONTRATOS, [data.placa.trim()])).rows;
    if (contratoRows.length === 0) {
      throw new Error(
        `No hay contrato para la placa ${data.placa.toUpperCase()}.`,
      );
    }
    let contratoRow;
    if (data.contratoId) {
      contratoRow = contratoRows.find(
        (c) => Number(c.contrato_id) === data.contratoId,
      );
    }
    if (!contratoRow) {
      if (contratoRows.length === 1) {
        contratoRow = contratoRows[0];
      } else {
        throw new Error("Hay varios contratos para esta placa; elige uno.");
      }
    }
    const contratoId = Number(contratoRow.contrato_id);
    const clienteId = Number(contratoRow.cliente_id);

    // Anti-doble-registro por referencia dentro del contrato
    const dup = (
      await client.query(
        `SELECT 1 FROM terminal_pagos_pagofactura p
         JOIN terminal_pagos_factura f ON f.id = p.factura_id
         WHERE f.contrato_id = $1 AND upper(p.referencia) = upper($2)
         LIMIT 1;`,
        [contratoId, data.referencia],
      )
    ).rows;
    if (dup.length > 0) {
      throw new Error(
        `La referencia ${data.referencia} ya fue registrada para este contrato.`,
      );
    }

    // ponytail: si no hay facturas pendientes, emitir tarifa(s) antes del FIFO
    let facturas = await ensureFacturasParaMonto(
      client,
      contratoId,
      toInt(contratoRow.tarifa),
      data.fechaPago,
      data.monto,
    );

    const { plan, sobrante } = planFifo(facturas, data.monto);
    if (plan.length === 0) {
      throw new Error("No se pudo aplicar el pago a facturas de tarifa.");
    }

    const pagos: PagoAplicado[] = [];
    for (const a of plan) {
      const f = facturas.find((x) => x.id === a.facturaId)!;
      const ins = await client.query(
        `INSERT INTO terminal_pagos_pagofactura
           (valor, referencia, canal_id, configuracion_id, factura_id,
            fecha_pago, validado, es_compensacion, referencia_original)
         VALUES ($1, $2, $3, $4, $5, $6, false, false, NULL)
         RETURNING id;`,
        [a.aplicar, data.referencia, canalId, data.configuracionId, a.facturaId, data.fechaPago],
      );
      const pagoId = Number(ins.rows[0].id);

      const nuevoPagado = f.pagado + a.aplicar;
      const nuevoEstado = nuevoPagado >= f.total ? "pagada" : "pendiente";
      await client.query(
        `UPDATE terminal_pagos_factura
         SET total_pagado = $1, estado_pago = $2 WHERE id = $3;`,
        [nuevoPagado, nuevoEstado, a.facturaId],
      );

      pagos.push({
        pagoId,
        facturaId: a.facturaId,
        aplicado: a.aplicar,
        estado: nuevoEstado,
      });
    }

    let prepagoId: number | null = null;
    if (sobrante > 0) {
      const facturaOrigenId = plan[plan.length - 1].facturaId;
      const pre = await client.query(
        `INSERT INTO terminal_pagos_prepago
           (fecha, valor, saldo_disponible, estado, cliente_id, contrato_id,
            factura_origen_id, factura_aplicacion_id, usuario_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NULL)
         RETURNING id;`,
        [data.fechaPago, sobrante, sobrante, ESTADO_PREPAGO, clienteId, contratoId, facturaOrigenId],
      );
      prepagoId = Number(pre.rows[0].id);
    }

    return {
      clienteNombre: String(contratoRow.nombre),
      contratoId,
      pagos,
      sobrante,
      prepagoId,
    };
  });
}
