import { loadClientesGeoJSON } from "@/lib/load-geojson";
import { PageClient } from "./page-client";

export default async function HomePage() {
  const data = await loadClientesGeoJSON();
  return <PageClient initialData={data} />;
}
