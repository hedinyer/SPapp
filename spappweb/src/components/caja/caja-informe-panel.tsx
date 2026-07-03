"use client";

import { formatCop } from "@/lib/utils/format";
import type { CajaInformeIngresos } from "@/lib/caja/caja-informe";

function Line({
  label,
  value,
  count,
  sign,
  muted,
  negative,
}: {
  label: string;
  value: number;
  count?: number;
  sign?: "+" | "−";
  muted?: boolean;
  negative?: boolean;
}) {
  if (value === 0 && (count == null || count === 0)) return null;
  return (
    <div
      className={`flex items-center justify-between text-sm ${muted ? "text-neutral-500" : ""}`}
    >
      <span>
        {label}
        {count != null && count > 0 ? ` (${count})` : ""}
      </span>
      <span
        className={`font-medium tabular-nums ${negative ? "text-red-600" : ""}`}
      >
        {sign ? `${sign} ` : ""}
        {formatCop(value)}
      </span>
    </div>
  );
}

export function CajaInformePanel({
  informe,
  visitasResumen,
  title = "Informe de ingresos",
  compact = false,
}: {
  informe: CajaInformeIngresos;
  visitasResumen?: {
    totalPendiente: number;
    pendientes: { length: number };
  };
  title?: string;
  compact?: boolean;
}) {
  const { efectivo, nequi, davivienda, egresos } = informe;
  const visitasPendientes = visitasResumen?.totalPendiente ?? 0;
  const showVisitasLine =
    informe.visitas.monto > 0 ||
    informe.visitas.cantidad > 0 ||
    visitasPendientes > 0;
  const tieneTransferenciasIn =
    nequi.monto > 0 || davivienda.monto > 0;
  const tieneTransferenciasOut =
    nequi.pagosSalida > 0 || davivienda.pagosSalida > 0;

  return (
    <div className="space-y-3">
      {title ? <p className="text-sm font-semibold">{title}</p> : null}

      <div className="space-y-2 rounded-lg border border-neutral-200 bg-white p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          Ingresos · efectivo en caja
        </p>
        <Line label="Apertura" value={efectivo.apertura} sign="+" muted />
        <Line label="Ventas productos (mostrador)" value={efectivo.ventasProducto} sign="+" />
        <Line label="Ventas motos (mostrador)" value={efectivo.ventasMoto} sign="+" />
        <Line label="Pagos crédito en efectivo" value={efectivo.pagosCredito} sign="+" />
        {showVisitasLine ? (
          <>
            <Line
              label="Visitas cobradas (efectivo/datáfono)"
              value={efectivo.pagosVisitaEfectivo ?? 0}
              sign="+"
            />
            <Line
              label="Visitas cobradas (total medios)"
              value={informe.visitas.monto}
              count={informe.visitas.cantidad}
              sign="+"
            />
            {visitasPendientes > 0 ? (
              <Line
                label="Completadas · falta registrar"
                value={visitasPendientes}
                muted
              />
            ) : null}
          </>
        ) : null}
        <Line label="Entradas manuales" value={efectivo.entradasManuales} sign="+" />
        <Line label="Salidas manuales" value={efectivo.salidasManuales} sign="−" negative />
        <Line label="Pagos registrados (efectivo)" value={efectivo.pagosSalida} sign="−" negative />
        {!compact ? (
          <div className="flex items-center justify-between border-t border-neutral-100 pt-2 text-sm font-semibold">
            <span>Efectivo esperado</span>
            <span className="tabular-nums">{formatCop(efectivo.esperadoEnCaja)}</span>
          </div>
        ) : null}
      </div>

      {tieneTransferenciasIn ? (
        <div className="space-y-2 rounded-lg border border-neutral-200 bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Ingresos · transferencias
          </p>
          <Line label="Nequi" value={nequi.monto} count={nequi.cantidad} sign="+" />
          <Line
            label="Davivienda / Daviplata"
            value={davivienda.monto}
            count={davivienda.cantidad}
            sign="+"
          />
        </div>
      ) : null}

      {egresos.total > 0 ? (
        <div className="space-y-2 rounded-lg border border-red-100 bg-red-50/50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-red-700">
            Pagos / salidas del día
          </p>
          <Line
            label="Efectivo"
            value={egresos.efectivo}
            sign="−"
            negative
          />
          <Line label="Nequi" value={egresos.nequi} sign="−" negative />
          <Line
            label="Davivienda / Daviplata"
            value={egresos.davivienda}
            sign="−"
            negative
          />
          <div className="flex items-center justify-between border-t border-red-100 pt-2 text-sm font-semibold text-red-700">
            <span>Total pagos ({egresos.cantidad})</span>
            <span className="tabular-nums">−{formatCop(egresos.total)}</span>
          </div>
        </div>
      ) : null}

      {tieneTransferenciasOut && !compact ? (
        <p className="text-xs text-neutral-500">
          Los pagos por Nequi o Davivienda no afectan el efectivo físico en caja.
        </p>
      ) : null}

      <div className="space-y-1 rounded-lg border border-neutral-300 bg-neutral-50 p-3">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>Ingresos del día</span>
          <span className="tabular-nums text-green-700">
            +{formatCop(informe.ingresosDia)}
          </span>
        </div>
        {egresos.total > 0 ? (
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Pagos del día</span>
            <span className="tabular-nums text-red-600">
              −{formatCop(informe.egresosDia)}
            </span>
          </div>
        ) : null}
        <div className="flex items-center justify-between border-t border-neutral-200 pt-2 text-sm font-bold">
          <span>Neto del día</span>
          <span
            className={`tabular-nums ${informe.netoDia >= 0 ? "text-green-700" : "text-red-600"}`}
          >
            {formatCop(informe.netoDia)}
          </span>
        </div>
        {!compact ? (
          <div className="flex items-center justify-between border-t border-neutral-200 pt-2 text-sm">
            <span className="text-neutral-600">Total con apertura</span>
            <span className="font-medium tabular-nums">
              {formatCop(informe.totalRecaudado)}
            </span>
          </div>
        ) : null}
      </div>

      {!compact && informe.pagos.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-neutral-500">
            Cobros crédito y visitas confirmados
          </p>
          <ul className="max-h-32 space-y-1 overflow-y-auto text-sm">
            {informe.pagos.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded border border-neutral-100 px-2 py-1"
              >
                <span className="truncate">
                  {p.clienteNombre ? `${p.clienteNombre} · ` : ""}
                  {p.contextoLabel} · {p.medioLabel}
                </span>
                <span className="shrink-0 tabular-nums font-medium text-green-700">
                  +{formatCop(p.monto)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!compact && informe.egresosDetalle.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-neutral-500">
            Detalle de pagos
          </p>
          <ul className="max-h-32 space-y-1 overflow-y-auto text-sm">
            {informe.egresosDetalle.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded border border-neutral-100 px-2 py-1"
              >
                <span className="truncate">
                  {e.concepto}
                  {e.beneficiario ? ` · ${e.beneficiario}` : ""}
                  <span className="text-neutral-400"> ({e.medioLabel})</span>
                </span>
                <span className="shrink-0 tabular-nums font-medium text-red-600">
                  −{formatCop(e.monto)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
