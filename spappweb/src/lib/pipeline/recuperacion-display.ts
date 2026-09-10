export type RecuperacionMarker =
  | { kind: "retenida" }
  | { kind: "devuelta"; veces: number };

/** Marcador de recuperación por mora para listado/ficha de clientes. */
export function getRecuperacionMarker(input: {
  estadoFisico?: string | null;
  garajeEstado?: string | null;
  /** true si hay fila recogida sin nota de devolución */
  recogerRetenida?: boolean;
  vecesRecuperada: number;
}): RecuperacionMarker | null {
  const retenidaAhora =
    input.estadoFisico === "recogida" ||
    input.garajeEstado === "retenida" ||
    input.garajeEstado === "en_mantenimiento" ||
    input.recogerRetenida === true;

  if (retenidaAhora) return { kind: "retenida" };
  if (input.vecesRecuperada > 0) {
    return { kind: "devuelta", veces: input.vecesRecuperada };
  }
  return null;
}

export function recuperacionMarkerLabel(marker: RecuperacionMarker): string {
  if (marker.kind === "retenida") return "RECUPERADA";
  const n = marker.veces;
  return `Recuperada ${n} ${n === 1 ? "vez" : "veces"} · Devuelta al comprador`;
}
