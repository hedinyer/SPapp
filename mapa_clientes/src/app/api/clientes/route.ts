import { NextResponse } from "next/server";
import { loadClientesGeoJSON } from "@/lib/load-geojson";

export const revalidate = 3600;

export async function GET() {
  const data = await loadClientesGeoJSON();
  return NextResponse.json(data);
}
