#!/usr/bin/env python3
"""Orquesta extract → geocode → enrich → GeoJSON."""
from __future__ import annotations

import csv
import json
import math
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(SCRIPTS))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")
load_dotenv(ROOT / "mapa_clientes" / ".env")

from extract_viaduct import extract_viaduct, normalizar_cedula  # noqa: E402
from extract_supabase import extract_supabase  # noqa: E402
from geocode import geocode_direccion  # noqa: E402
from enrich_dane import enrich_records  # noqa: E402
from barrios_bga import (
    es_bucaramanga,
    excluir_por_nombre,
    lookup_barrio,
    parse_barrio_bga,
)  # noqa: E402
from barrios_bogota import excluir_por_direccion_bogota  # noqa: E402

OUT_PATH = Path(__file__).resolve().parents[1] / "data" / "clientes_mapa.geojson"
SIN_UBICAR_PATH = Path(__file__).resolve().parents[1] / "data" / "clientes_sin_ubicar.json"
SIN_BARRIO_PATH = Path(__file__).resolve().parents[1] / "data" / "clientes_sin_barrio.csv"

MAX_GEOCODE = int(os.getenv("MAX_GEOCODE", "2500"))


def coord_ok(value) -> bool:
    if value is None:
        return False
    try:
        return math.isfinite(float(value))
    except (TypeError, ValueError):
        return False


def merge_sources(viaduct_rows: list[dict], supabase_by_cedula: dict[str, dict]) -> list[dict]:
    merged: dict[str, dict] = {}

    for row in viaduct_rows:
        ced = row.get("cedula") or normalizar_cedula(row.get("cedula_raw"))
        if not ced:
            continue
        merged[ced] = {**row, "cedula": ced}

    for ced, sb in supabase_by_cedula.items():
        if ced in merged:
            merged[ced].update(
                {
                    k: v
                    for k, v in sb.items()
                    if v is not None and k != "cedula"
                }
            )
        else:
            direccion = sb.get("direccion_supabase") or ""
            if not direccion:
                continue
            merged[ced] = {
                "cedula": ced,
                "nombre": sb.get("nombre_supabase") or "",
                "direccion": direccion,
                "telefono": sb.get("celular_supabase"),
                "barrio_supabase": sb.get("barrio_supabase"),
                **sb,
            }

    return list(merged.values())


def resolve_coords(
    record: dict, *,
    geocode_state: dict,
) -> tuple[float | None, float | None, str | None, dict | None]:
    gps_visita = record.get("gps_visita")
    if gps_visita and gps_visita.get("lat") is not None:
        return (
            float(gps_visita["lat"]),
            float(gps_visita["lng"]),
            "gps_visita",
            None,
        )

    gps_sol = record.get("gps_solicitud")
    if gps_sol and gps_sol.get("lat") is not None:
        return (
            float(gps_sol["lat"]),
            float(gps_sol["lng"]),
            "gps_solicitud",
            None,
        )

    direccion = (
        record.get("direccion")
        or record.get("direccion_supabase")
        or ""
    ).strip()
    barrio = record.get("barrio_supabase") or record.get("barrio")
    combined = f"{direccion} {barrio or ''}".strip()

    hit = lookup_barrio(combined)
    if hit:
        return hit["lat"], hit["lng"], "barrio_bga", hit

    return None, None, None, None


def to_geojson(enriched: list[dict]) -> tuple[dict, list[dict]]:
    features = []
    sin_ubicar = []

    for r in enriched:
        lat = r.get("lat")
        lng = r.get("lng")
        if not coord_ok(lat) or not coord_ok(lng):
            sin_ubicar.append(
                {
                    "cedula": r.get("cedula"),
                    "nombre": r.get("nombre"),
                    "direccion": r.get("direccion"),
                    "motivo": "sin_coordenadas",
                }
            )
            continue

        props = {
            k: v
            for k, v in r.items()
            if k not in ("geocode", "gps_visita", "gps_solicitud")
            and v is not None
        }
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lng, lat]},
                "properties": props,
            }
        )

    return {"type": "FeatureCollection", "features": features}, sin_ubicar


def build() -> Path:
    try:
        print("Extrayendo viaduct...")
        viaduct = extract_viaduct()
        print(f"  {len(viaduct)} filas")
    except Exception as e:
        print(f"  ADVERTENCIA: fallo extract_viaduct: {e}")
        viaduct = []

    try:
        print("Extrayendo Supabase...")
        supabase = extract_supabase()
        print(f"  {len(supabase)} por cédula")
    except Exception as e:
        print(f"  ADVERTENCIA: fallo extract_supabase: {e}")
        supabase = {}

    merged = merge_sources(viaduct, supabase)
    print(f"  {len(merged)} clientes unificados")

    filtrados: list[dict] = []
    sin_barrio: list[dict] = []
    excl_nombre = 0
    excl_ciudad = 0
    excl_dir_bogota = 0
    excl_sin_barrio = 0
    for r in merged:
        nombre = r.get("nombre") or r.get("nombre_supabase")
        direccion = (r.get("direccion") or r.get("direccion_supabase") or "")
        barrio = r.get("barrio_supabase")
        if excluir_por_nombre(nombre):
            excl_nombre += 1
            continue
        if excluir_por_direccion_bogota(direccion, barrio):
            excl_dir_bogota += 1
            continue
        parsed = parse_barrio_bga(direccion, barrio)
        if not parsed:
            excl_sin_barrio += 1
            sin_barrio.append(
                {
                    "nombre": nombre or "",
                    "direccion": direccion.strip(),
                }
            )
            continue
        if not es_bucaramanga(direccion, barrio):
            excl_ciudad += 1
            continue
        r["barrio_parseado"] = parsed["barrio"]
        filtrados.append(r)
    merged = filtrados
    print(f"  excluidos nombre (Bogotá/Chía): {excl_nombre}")
    print(f"  excluidos dirección Bogotá: {excl_dir_bogota}")
    print(f"  excluidos sin barrio BGA: {excl_sin_barrio}")
    print(f"  excluidos otra ciudad: {excl_ciudad}")
    print(f"  {len(merged)} Bucaramanga en dataset")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with SIN_BARRIO_PATH.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=["nombre", "direccion"])
        w.writeheader()
        w.writerows(sin_barrio)
    print(f"Sin barrio CSV: {SIN_BARRIO_PATH} ({len(sin_barrio)} filas)")

    geocode_state = {"count": 0, "max": MAX_GEOCODE}
    for rec in merged:
        lat, lng, fuente, geo = resolve_coords(
            rec, geocode_state=geocode_state
        )
        rec["lat"] = lat
        rec["lng"] = lng
        rec["fuente_ubicacion"] = fuente
        if geo:
            rec["geocode"] = geo
            rec["municipio"] = geo.get("municipio") or "Bucaramanga"
            rec["departamento"] = geo.get("departamento") or "Santander"
            if geo.get("barrio"):
                rec["barrio_osm"] = geo["barrio"]

    mora_dias = max(
        (r.get("mora_dias") or 0 for r in merged),
        default=0,
    )
    for r in merged:
        if not r.get("mora_dias"):
            pend = r.get("facturas_pendientes") or 0
            if pend > 0 and r.get("dias_sin_pago"):
                r["mora_dias"] = r["dias_sin_pago"]

    if merged:
        print("Enriqueciendo DANE + segmentos...")
        enriched = enrich_records(merged)
    else:
        enriched = []

    geojson, sin_ubicar = to_geojson(enriched)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(geojson, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    SIN_UBICAR_PATH.write_text(
        json.dumps(sin_ubicar, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"GeoJSON: {OUT_PATH} ({len(geojson['features'])} puntos)")
    print(f"Sin ubicar: {len(sin_ubicar)}")

    # asserts mínimos
    assert geojson["type"] == "FeatureCollection"
    cedulas = [f["properties"].get("cedula") for f in geojson["features"]]
    assert len(cedulas) == len(set(cedulas)), "duplicados por cédula"
    if geojson["features"]:
        gps_priority = sum(
            1
            for f in geojson["features"]
            if f["properties"].get("fuente_ubicacion") in ("gps_visita", "gps_solicitud")
        )
        print(f"  GPS directo: {gps_priority}")
    else:
        print("  AVISO: 0 puntos geocodificados (revisar direcciones o cache)")

    return OUT_PATH


if __name__ == "__main__":
    build()
