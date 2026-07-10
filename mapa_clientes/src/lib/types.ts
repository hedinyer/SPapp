export type ClienteFeatureProperties = {
  cedula: string;
  nombre?: string;
  direccion?: string;
  telefono?: string;
  tarifa?: number;
  placa?: string;
  marca?: string;
  modelo?: string;
  segmento?: string;
  fuente_ubicacion?: string;
  mora_dias?: number;
  facturas_pendientes?: number;
  total_pagado?: number;
  municipio_nombre?: string;
  barrio_osm?: string;
  barrio_parseado?: string;
  quintil_ingreso_muni?: number;
  nbi_municipio?: number;
  poblacion_municipio?: number;
  dane_municipio?: string;
  es_activo?: boolean;
};

export type ClienteFeature = {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: ClienteFeatureProperties;
};

export type ClienteGeoJSON = {
  type: "FeatureCollection";
  features: ClienteFeature[];
};

export const SEGMENTO_COLORS: Record<string, string> = {
  alto_valor: "#22d3ee",
  en_mora: "#f87171",
  nuevo: "#a78bfa",
  zona_caliente: "#fbbf24",
  recuperacion: "#fb923c",
  general: "#94a3b8",
};

export function parseSegmentos(segmento?: string): string[] {
  if (!segmento) return ["general"];
  return segmento.split("|").filter(Boolean);
}

export function primarySegmento(segmento?: string): string {
  const parts = parseSegmentos(segmento);
  return parts[0] ?? "general";
}
