"use client";

import dynamic from "next/dynamic";
import type { ClienteGeoJSON } from "@/lib/types";

const MapaHeatmap = dynamic(
  () => import("@/components/mapa-heatmap").then((m) => m.MapaHeatmap),
  { ssr: false },
);

export function PageClient({ initialData }: { initialData: ClienteGeoJSON }) {
  return <MapaHeatmap initialData={initialData} />;
}

