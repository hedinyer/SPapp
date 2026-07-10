import { readFile } from "fs/promises";
import path from "path";
import type { ClienteGeoJSON } from "@/lib/types";

const GEOJSON_PATH = path.join(
  process.cwd(),
  "data",
  "clientes_mapa.geojson",
);

export async function loadClientesGeoJSON(): Promise<ClienteGeoJSON> {
  try {
    const raw = await readFile(GEOJSON_PATH, "utf-8");
    return JSON.parse(raw) as ClienteGeoJSON;
  } catch {
    return { type: "FeatureCollection", features: [] };
  }
}
