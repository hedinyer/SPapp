import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const geojson = join(process.cwd(), "data", "clientes_mapa.geojson");

function datasetOk() {
  if (!existsSync(geojson)) return false;
  const raw = readFileSync(geojson, "utf8");
  if (!raw.includes('"type": "Feature"')) return false;
  if (raw.includes("NaN")) return false;
  return true;
}

if (!datasetOk()) {
  console.log("Generando clientes_mapa.geojson …");
  const r = spawnSync("python", ["scripts/build_dataset.py"], {
    stdio: "inherit",
    cwd: process.cwd(),
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}
