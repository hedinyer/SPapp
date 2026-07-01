"use client";

import { useEffect, useState } from "react";
import {
  getDestinatarios,
  ocrComprobante,
  previewPagoTarifa,
  registrarPagoTarifa,
} from "./actions";
import type {
  Destinatario,
  PreviewResult,
  RegistrarResult,
} from "@/lib/types";

function formatCop(n: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

function isoToBogotaDate(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(d);
}

export default function PagoForm() {
  const [placa, setPlaca] = useState("");
  const [monto, setMonto] = useState("");
  const [referencia, setReferencia] = useState("");
  const [fecha, setFecha] = useState(isoToBogotaDate(null));
  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([]);
  const [configuracionId, setConfiguracionId] = useState<number | "">("");
  const [contratoId, setContratoId] = useState<number | "">("");

  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<RegistrarResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [ocrLoading, setOcrLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDestinatarios()
      .then(setDestinatarios)
      .catch((e) => setError(e instanceof Error ? e.message : "Error cargando destinatarios"));
  }, []);

  function selectFile(f: File | null) {
    setFile(f);
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return f ? URL.createObjectURL(f) : null;
    });
  }

  // Pegar imagen desde el portapapeles con Ctrl+V (nativo, sin dependencias).
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of items) {
        if (it.type.startsWith("image/")) {
          const blob = it.getAsFile();
          if (blob) {
            const ext = blob.type.split("/")[1] || "png";
            selectFile(new File([blob], `portapapeles.${ext}`, { type: blob.type }));
            setError(null);
            e.preventDefault();
            return;
          }
        }
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function pasteFromClipboard() {
    try {
      if (!navigator.clipboard?.read) {
        setError("Tu navegador no permite leer el portapapeles; usa Ctrl+V.");
        return;
      }
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (type) {
          const blob = await item.getType(type);
          const ext = type.split("/")[1] || "png";
          selectFile(new File([blob], `portapapeles.${ext}`, { type }));
          setError(null);
          return;
        }
      }
      setError("No hay una imagen en el portapapeles.");
    } catch {
      setError("No se pudo leer el portapapeles. Usa Ctrl+V para pegar.");
    }
  }

  function resetOutputs() {
    setPreview(null);
    setResult(null);
    setError(null);
  }

  async function handleOcr() {
    if (!file) {
      setError("Selecciona o pega la imagen del comprobante.");
      return;
    }
    resetOutputs();
    setOcrLoading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await ocrComprobante(fd);
      if (r.monto != null) setMonto(String(r.monto));
      if (r.referencia) setReferencia(r.referencia);
      setFecha(isoToBogotaDate(r.fechaComprobante));
      if (r.confidence < 3) {
        setError(
          "El OCR no leyo todos los campos con seguridad. Revisa monto, referencia y fecha.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer el comprobante.");
    } finally {
      setOcrLoading(false);
    }
  }

  async function runPreview(forcedContratoId?: number) {
    setError(null);
    setResult(null);
    setPreviewLoading(true);
    try {
      const r = await previewPagoTarifa({
        placa,
        monto: Number(monto) || 0,
        contratoId: forcedContratoId ?? (contratoId === "" ? undefined : contratoId),
        fechaPago: fecha,
      });
      setPreview(r);
      if (r.contratoId) setContratoId(r.contratoId);
    } catch (e) {
      setPreview(null);
      setError(e instanceof Error ? e.message : "No se pudo calcular el reparto.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleRegister() {
    if (configuracionId === "") {
      setError("Elige el destinatario (cuenta Nequi).");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const r = await registrarPagoTarifa({
        placa,
        contratoId: contratoId === "" ? undefined : contratoId,
        monto: Number(monto),
        referencia,
        fechaPago: fecha,
        configuracionId: Number(configuracionId),
      });
      setResult(r);
      setPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar el pago.");
    } finally {
      setSaving(false);
    }
  }

  function onPlacaChange(value: string) {
    setPlaca(value.toUpperCase());
    setContratoId("");
    setPreview(null);
    setResult(null);
    setError(null);
  }

  async function handleAgregarPago() {
    setResult(null);
    setError(null);

    if (!placa.trim()) {
      setError("Escribe la placa.");
      return;
    }
    const montoNum = Number(monto);
    if (!montoNum || montoNum <= 0) {
      setError("Ingresa un monto válido.");
      return;
    }
    if (!referencia.trim()) {
      setError("Ingresa la referencia.");
      return;
    }
    if (configuracionId === "") {
      setError("Elige el destinatario (cuenta Nequi).");
      return;
    }

    setSaving(true);
    try {
      let resolvedContratoId = contratoId === "" ? undefined : contratoId;

      if (!resolvedContratoId) {
        const prev = await previewPagoTarifa({
          placa,
          monto: montoNum,
          fechaPago: fecha,
        });
        if (prev.contratoId === null && prev.contratos.length > 1) {
          setPreview(prev);
          setError("Hay varios contratos para esta placa. Elige uno abajo.");
          return;
        }
        if (prev.contratoId) {
          resolvedContratoId = prev.contratoId;
          setContratoId(prev.contratoId);
        }
        setPreview(prev);
      }

      const r = await registrarPagoTarifa({
        placa,
        contratoId: resolvedContratoId,
        monto: montoNum,
        referencia,
        fechaPago: fecha,
        configuracionId: Number(configuracionId),
      });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar el pago.");
    } finally {
      setSaving(false);
    }
  }

  const multiplesContratos = preview && preview.contratoId === null && preview.contratos.length > 1;

  return (
    <main className="page">
      <h1>Registrar pago de tarifa</h1>
      <p className="subtitle">Lee el comprobante Nequi y abonalo a la placa (origen: Nequi).</p>

      {error && <div className="alert error">{error}</div>}

      {result && (
        <div className="alert success">
          <strong>Pago registrado</strong> — {result.clienteNombre} (contrato {result.contratoId})
          <table style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>Factura</th>
                <th>Aplicado</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {result.pagos.map((p) => (
                <tr key={p.pagoId}>
                  <td>#{p.facturaId}</td>
                  <td className="amount">{formatCop(p.aplicado)}</td>
                  <td>
                    <span className={`tag ${p.estado === "pagada" ? "completa" : "parcial"}`}>
                      {p.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.sobrante > 0 && (
            <p style={{ marginBottom: 0 }}>
              Prepago #{result.prepagoId}: saldo a favor {formatCop(result.sobrante)}.
            </p>
          )}
        </div>
      )}

      <div className="card">
        <div className="field">
          <label>Placa</label>
          <input
            value={placa}
            onChange={(e) => onPlacaChange(e.target.value)}
            placeholder="ABC12D"
            autoCapitalize="characters"
          />
        </div>
        <div className="field">
          <label>Comprobante (imagen)</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
          />
          <p className="muted" style={{ fontSize: "0.8rem", margin: "6px 0 0" }}>
            Tambien puedes pegar con Ctrl+V o el boton de abajo.
          </p>
        </div>
        {previewUrl && (
          <div className="field">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Comprobante"
              style={{
                maxWidth: "100%",
                maxHeight: 220,
                borderRadius: 8,
                border: "1px solid var(--border)",
              }}
            />
          </div>
        )}
        <div className="btn-row">
          <button onClick={handleOcr} disabled={ocrLoading}>
            {ocrLoading ? "Leyendo..." : "Leer comprobante"}
          </button>
          <button className="secondary" onClick={pasteFromClipboard} disabled={ocrLoading}>
            Pegar del portapapeles
          </button>
        </div>
      </div>

      <div className="card">
        <div className="row">
          <div className="field">
            <label>Monto</label>
            <input
              inputMode="numeric"
              value={monto}
              onChange={(e) => setMonto(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="8000"
            />
          </div>
          <div className="field">
            <label>Referencia</label>
            <input
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="M12636825"
            />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>Fecha del pago</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="field">
            <label>Destinatario (Nequi)</label>
            <select
              value={configuracionId}
              onChange={(e) =>
                setConfiguracionId(e.target.value === "" ? "" : Number(e.target.value))
              }
            >
              <option value="">Elige cuenta...</option>
              {destinatarios.map((d) => (
                <option key={d.configuracionId} value={d.configuracionId}>
                  {d.cuenta}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="btn-row">
          <button
            className="secondary"
            type="button"
            onClick={() => runPreview()}
            disabled={previewLoading || saving || !placa}
          >
            {previewLoading ? "Calculando..." : "Ver reparto"}
          </button>
          <button
            type="button"
            onClick={handleAgregarPago}
            disabled={saving || previewLoading || !placa}
          >
            {saving ? "Registrando..." : "Agregar pago"}
          </button>
        </div>
      </div>

      {multiplesContratos && (
        <div className="card">
          <div className="alert info">
            Hay varios contratos para esta placa. Elige uno:
          </div>
          {preview!.contratos.map((c) => (
            <div className="btn-row" key={c.contratoId}>
              <button className="secondary" onClick={() => runPreview(c.contratoId)}>
                Contrato {c.contratoId} — {c.clienteNombre} ({c.cedula}) · tarifa{" "}
                {formatCop(c.tarifa)}
              </button>
            </div>
          ))}
        </div>
      )}

      {preview && preview.contratoId && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Reparto FIFO</h3>
          {preview.facturas.length === 0 ? (
            <div className="alert info">No hay facturas de tarifa pendientes.</div>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Factura</th>
                    <th>Fecha</th>
                    <th>Saldo</th>
                    <th>Aplica</th>
                    <th>Queda</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.plan.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="muted">
                        Ingresa un monto y vuelve a calcular.
                      </td>
                    </tr>
                  ) : (
                    preview.plan.map((p) => (
                      <tr key={p.facturaId}>
                        <td>#{p.facturaId}</td>
                        <td>{p.fecha}</td>
                        <td className="amount">{formatCop(p.saldoAntes)}</td>
                        <td className="amount">{formatCop(p.aplicar)}</td>
                        <td>
                          <span className={`tag ${p.queda === 0 ? "completa" : "parcial"}`}>
                            {p.queda === 0 ? "paga" : formatCop(p.queda)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {preview.sobrante > 0 && (
                <div className="alert info" style={{ marginTop: 12 }}>
                  Sobrante {formatCop(preview.sobrante)} → se guardara como prepago (saldo a favor).
                </div>
              )}
              {preview.plan.length > 0 && (
                <div className="btn-row">
                  <button onClick={handleRegister} disabled={saving}>
                    {saving ? "Registrando..." : "Registrar pago"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}
