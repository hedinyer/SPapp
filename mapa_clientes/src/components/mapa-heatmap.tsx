"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import "leaflet/dist/leaflet.css";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import "leaflet.heat";
import type { ClienteFeature, ClienteGeoJSON } from "@/lib/types";
import {
  SEGMENTO_COLORS,
  parseSegmentos,
  primarySegmento,
} from "@/lib/types";
import { formatCop } from "@/lib/utils";
import { LassoPanel } from "@/components/lasso-panel";
import { SegmentoCards, countSegmentos } from "@/components/segmento-cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Flame, MapPin, RefreshCw } from "lucide-react";
import { toast } from "sonner";

// ponytail: fix default marker paths not needed — usamos CircleMarker

type Props = {
  initialData: ClienteGeoJSON;
};

const BUCARAMANGA: [number, number] = [7.1254, -73.1198];

function HeatLayer({
  points,
  visible,
}: {
  points: [number, number, number][];
  visible: boolean;
}) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (!visible || !points.length) {
      layerRef.current?.remove();
      layerRef.current = null;
      return;
    }
    const heat = (
      L as typeof L & {
        heatLayer: (
          latlngs: [number, number, number?][],
          opts?: object,
        ) => L.Layer;
      }
    ).heatLayer(points, {
      radius: 28,
      blur: 22,
      maxZoom: 17,
      gradient: {
        0.2: "#0e7490",
        0.5: "#22d3ee",
        0.7: "#fbbf24",
        1.0: "#f87171",
      },
    });
    heat.addTo(map);
    layerRef.current = heat;
    return () => {
      heat.remove();
      layerRef.current = null;
    };
  }, [map, points, visible]);

  return null;
}

function GeomanControl({
  onPolygon,
}: {
  onPolygon: (coords: [number, number][][]) => void;
}) {
  const map = useMap();

  useEffect(() => {
    map.pm.addControls({
      position: "topleft",
      drawPolygon: true,
      drawRectangle: true,
      drawCircle: false,
      drawMarker: false,
      drawPolyline: false,
      drawText: false,
      editMode: true,
      dragMode: false,
      cutPolygon: false,
      removalMode: true,
    });

    const onCreate = (e: { layer: L.Layer }) => {
      const layer = e.layer as L.Polygon;
      const latlngs = layer.getLatLngs();
      const ring = (Array.isArray(latlngs[0]) ? latlngs[0] : latlngs) as L.LatLng[];
      const coords: [number, number][] = ring.map((ll) => [ll.lng, ll.lat]);
      if (coords.length > 2) {
        coords.push(coords[0]);
        onPolygon([coords]);
      }
    };

    const onRemove = () => onPolygon([]);

    map.on("pm:create", onCreate);
    map.on("pm:remove", onRemove);

    return () => {
      map.off("pm:create", onCreate);
      map.off("pm:remove", onRemove);
      map.pm.removeControls();
    };
  }, [map, onPolygon]);

  return null;
}

export function MapaHeatmap({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [heatmap, setHeatmap] = useState(true);
  const [showPins, setShowPins] = useState(false);
  const [filtroSegmento, setFiltroSegmento] = useState("");
  const [filtroMora, setFiltroMora] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [polygon, setPolygon] = useState<[number, number][][] | null>(null);
  const [selected, setSelected] = useState<ClienteFeature[]>([]);

  const filtered = useMemo(() => {
    return data.features.filter((f) => {
      const p = f.properties;
      const nombre = (p.nombre || "").toLowerCase();
      if (nombre.includes("bogota") || nombre.includes("chia")) return false;
      if (!p.barrio_osm && !(p as { barrio_parseado?: string }).barrio_parseado) {
        return false;
      }
      const muni = (p.municipio_nombre || p.municipio || "").toLowerCase();
      if (muni && !muni.includes("bucaramanga")) return false;
      if (filtroMora) {
        const mora =
          (p.mora_dias ?? 0) > 0 ||
          (p.facturas_pendientes ?? 0) > 0 ||
          parseSegmentos(p.segmento).includes("en_mora");
        if (!mora) return false;
      }
      if (filtroSegmento) {
        if (!parseSegmentos(p.segmento).includes(filtroSegmento)) return false;
      }
      if (filtroTexto.trim()) {
        const q = filtroTexto.toLowerCase();
        const hay =
          p.nombre?.toLowerCase().includes(q) ||
          p.cedula?.includes(q) ||
          p.barrio_osm?.toLowerCase().includes(q) ||
          p.direccion?.toLowerCase().includes(q);
        if (!hay) return false;
      }
      return true;
    });
  }, [data, filtroSegmento, filtroMora, filtroTexto]);

  const heatPoints = useMemo((): [number, number, number][] => {
    return filtered.map((f) => {
      const [lng, lat] = f.geometry.coordinates;
      const w = f.properties.tarifa ? Math.min(1, f.properties.tarifa / 50000) : 0.5;
      return [lat, lng, w];
    });
  }, [filtered]);

  const handlePolygon = useCallback(
    (rings: [number, number][][]) => {
      if (!rings.length) {
        setPolygon(null);
        setSelected([]);
        return;
      }
      setPolygon(rings);
      const poly = {
        type: "Feature" as const,
        geometry: { type: "Polygon" as const, coordinates: rings },
        properties: {},
      };
      const inside = filtered.filter((f) => {
        const [lng, lat] = f.geometry.coordinates;
        return booleanPointInPolygon(
          { type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: {} },
          poly,
        );
      });
      setSelected(inside);
      toast.success(`${inside.length} clientes en la zona`);
    },
    [filtered],
  );

  async function refreshData() {
    setLoading(true);
    try {
      const res = await fetch("/api/clientes");
      const json = (await res.json()) as ClienteGeoJSON;
      setData(json);
      setPolygon(null);
      setSelected([]);
      toast.success(`${json.features.length} clientes cargados`);
    } catch {
      toast.error("No se pudo recargar el dataset");
    } finally {
      setLoading(false);
    }
  }

  const segmentoCounts = useMemo(() => countSegmentos(filtered), [filtered]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs text-muted-foreground">
            Buscar
          </label>
          <Input
            placeholder="Nombre, cédula, barrio..."
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Segmento
          </label>
          <select
            className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
            value={filtroSegmento}
            onChange={(e) => setFiltroSegmento(e.target.value)}
          >
            <option value="">Todos</option>
            {Object.keys(SEGMENTO_COLORS).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <label className="flex h-9 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filtroMora}
            onChange={(e) => setFiltroMora(e.target.checked)}
            className="rounded"
          />
          Solo mora
        </label>
        <Button
          variant={heatmap ? "default" : "outline"}
          size="sm"
          onClick={() => setHeatmap((v) => !v)}
        >
          <Flame className="size-4" />
          Heatmap
        </Button>
        <Button
          variant={showPins ? "default" : "outline"}
          size="sm"
          onClick={() => setShowPins((v) => !v)}
        >
          <MapPin className="size-4" />
          Pins
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshData}
          disabled={loading}
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Recargar
        </Button>
      </div>

      <SegmentoCards counts={segmentoCounts} />

      <div className="flex h-[calc(100vh-12rem)] overflow-hidden rounded-xl border border-border">
        <div className={`map-shell fade-map flex-1 ${heatmap ? "opacity-100" : "opacity-95"}`}>
          {filtered.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Sin clientes con ubicación. Ejecuta{" "}
              <code className="mx-1 rounded bg-muted px-1">
                python scripts/build_dataset.py
              </code>
            </div>
          ) : (
            <MapContainer
              center={BUCARAMANGA}
              zoom={12}
              className="h-full w-full"
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <HeatLayer points={heatPoints} visible={heatmap} />
              <GeomanControl onPolygon={handlePolygon} />
              {showPins &&
                filtered.map((f) => {
                  const [lng, lat] = f.geometry.coordinates;
                  const seg = primarySegmento(f.properties.segmento);
                  const color = SEGMENTO_COLORS[seg] ?? "#94a3b8";
                  return (
                    <CircleMarker
                      key={f.properties.cedula}
                      center={[lat, lng]}
                      radius={6}
                      pathOptions={{
                        color,
                        fillColor: color,
                        fillOpacity: 0.75,
                        weight: 1,
                      }}
                    >
                      <Popup>
                        <div className="text-sm">
                          <p className="font-semibold">{f.properties.nombre}</p>
                          <p className="text-xs opacity-80">{f.properties.cedula}</p>
                          <p>{f.properties.direccion}</p>
                          {f.properties.barrio_osm && (
                            <p>Barrio: {f.properties.barrio_osm}</p>
                          )}
                          <p>Tarifa: {formatCop(f.properties.tarifa)}</p>
                          <p>Segmento: {f.properties.segmento}</p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
            </MapContainer>
          )}
        </div>
        <LassoPanel
          selected={selected}
          onClear={() => {
            setPolygon(null);
            setSelected([]);
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {filtered.length} clientes en Bucaramanga
        {polygon ? ` · ${selected.length} seleccionados por lazo` : ""}
      </p>
    </div>
  );
}
