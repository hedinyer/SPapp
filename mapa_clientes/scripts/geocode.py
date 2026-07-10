#!/usr/bin/env python3
"""Geocodificación Nominatim/Photon + cache SQLite."""
from __future__ import annotations

import hashlib
import json
import re
import sqlite3
import time
import urllib.parse
import urllib.request
from pathlib import Path

from ciudades_co import geocode_suffix, infer_lugar
from barrios_bga import lookup_barrio

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
CACHE_PATH = DATA_DIR / "geocode_cache.sqlite"
USER_AGENT = "SPappMapaClientes/1.0 (uso interno; contacto@spapp.local)"
_LAST_REQUEST = 0.0
_LAST_PHOTON = 0.0


def _cache_conn() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(CACHE_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS geocode_cache (
            direccion_hash TEXT PRIMARY KEY,
            query TEXT NOT NULL,
            lat REAL,
            lng REAL,
            barrio TEXT,
            municipio TEXT,
            departamento TEXT,
            raw_json TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
        """
    )
    return conn


def _hash_query(q: str) -> str:
    return hashlib.sha256(("v2|" + q).encode("utf-8")).hexdigest()


def _rate_limit() -> None:
    global _LAST_REQUEST
    elapsed = time.time() - _LAST_REQUEST
    if elapsed < 1.0:
        time.sleep(1.0 - elapsed)
    _LAST_REQUEST = time.time()


def _rate_limit_photon() -> None:
    global _LAST_PHOTON
    elapsed = time.time() - _LAST_PHOTON
    if elapsed < 0.25:
        time.sleep(0.25 - elapsed)
    _LAST_PHOTON = time.time()


def _nominatim_search(query: str) -> dict | None:
    _rate_limit()
    params = urllib.parse.urlencode(
        {"q": query, "format": "json", "limit": 1, "countrycodes": "co"}
    )
    url = f"https://nominatim.openstreetmap.org/search?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
    except Exception:
        return None
    if not data:
        return None
    hit = data[0]
    addr = hit.get("address") or {}
    return {
        "lat": float(hit["lat"]),
        "lng": float(hit["lon"]),
        "barrio": (
            addr.get("neighbourhood")
            or addr.get("suburb")
            or addr.get("quarter")
            or addr.get("city_district")
        ),
        "municipio": addr.get("city") or addr.get("town") or addr.get("municipality"),
        "departamento": addr.get("state") or addr.get("region"),
        "raw_json": json.dumps(hit, ensure_ascii=False),
    }


def _photon_search(query: str) -> dict | None:
    _rate_limit_photon()
    params = urllib.parse.urlencode({"q": query, "limit": 1, "lang": "es"})
    url = f"https://photon.komoot.io/api/?{params}"
    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            data = json.loads(resp.read().decode())
    except Exception:
        return None
    features = data.get("features") or []
    if not features:
        return None
    hit = features[0]
    props = hit.get("properties") or {}
    lng, lat = hit["geometry"]["coordinates"]
    return {
        "lat": float(lat),
        "lng": float(lng),
        "barrio": props.get("district") or props.get("locality"),
        "municipio": props.get("city") or props.get("county"),
        "departamento": props.get("state"),
        "raw_json": json.dumps(hit, ensure_ascii=False),
    }


def geocode_direccion(
    direccion: str,
    barrio: str | None = None,
    *,
    use_cache: bool = True,
    allow_remote: bool = True,
    solo_bucaramanga: bool = False,
) -> dict | None:
    direccion = (direccion or "").strip()
    if not direccion:
        return None

    combined = f"{direccion} {barrio or ''}".strip()
    if solo_bucaramanga:
        hit = lookup_barrio(combined)
        if hit:
            return {
                **hit,
                "query": combined,
                "from_cache": False,
                "aproximado": True,
                "fuente": "barrio_bga",
            }

    parts = [direccion]
    if barrio:
        parts.append(barrio.strip())
    if solo_bucaramanga:
        parts.append("Bucaramanga, Santander, Colombia")
    else:
        parts.append(geocode_suffix(direccion, barrio))
    query = ", ".join(p for p in parts if p)
    inferred = infer_lugar(direccion) or infer_lugar(barrio or "")

    h = _hash_query(query)
    conn = _cache_conn()
    if use_cache:
        row = conn.execute(
            "SELECT lat, lng, barrio, municipio, departamento FROM geocode_cache WHERE direccion_hash = ?",
            (h,),
        ).fetchone()
        if row and row[0] is not None and row[1] is not None:
            conn.close()
            return {
                "lat": row[0],
                "lng": row[1],
                "barrio": row[2],
                "municipio": row[3] or (inferred or {}).get("municipio"),
                "departamento": row[4] or (inferred or {}).get("depto"),
                "query": query,
                "from_cache": True,
            }

    result = None
    if not allow_remote:
        conn.close()
    else:
        result = _nominatim_search(query)
        if not result:
            result = _photon_search(query)
        if result and inferred:
            if not result.get("municipio"):
                result["municipio"] = inferred["municipio"]
            if not result.get("departamento"):
                result["departamento"] = inferred["depto"]
        if result:
            conn.execute(
                """
                INSERT OR REPLACE INTO geocode_cache
                (direccion_hash, query, lat, lng, barrio, municipio, departamento, raw_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    h,
                    query,
                    result["lat"],
                    result["lng"],
                    result.get("barrio"),
                    result.get("municipio"),
                    result.get("departamento"),
                    result.get("raw_json"),
                ),
            )
            conn.commit()
        conn.close()
    if not result:
        combined = f"{direccion} {barrio or ''}".strip()
        fb = fallback_coords(combined)
        return fb
    return {**result, "query": query, "from_cache": False}


def fallback_coords(direccion: str, cedula: str = "") -> dict | None:
    """Centroide inferido o BGA si no hay ciudad en el texto."""
    lugar = infer_lugar(direccion or "")
    if not lugar or lugar.get("lat") is None:
        # ponytail: mayoría sin ciudad en dirección → metro BGA, no Bogotá
        lugar = {
            "municipio": "Bucaramanga",
            "depto": "Santander",
            "lat": 7.1254,
            "lng": -73.1198,
        }
    lat = float(lugar["lat"])
    lng = float(lugar["lng"])
    seed = int(hashlib.md5((cedula or direccion).encode()).hexdigest()[:8], 16)
    jitter_lat = ((seed % 1000) - 500) / 45000
    jitter_lng = (((seed // 1000) % 1000) - 500) / 45000
    return {
        "lat": lat + jitter_lat,
        "lng": lng + jitter_lng,
        "barrio": None,
        "municipio": lugar["municipio"],
        "departamento": lugar["depto"],
        "query": direccion,
        "from_cache": False,
        "aproximado": True,
    }


if __name__ == "__main__":
    from ciudades_co import _demo

    _demo()
    r = geocode_direccion("Calle 31B Sur No. 13 Este-54 Bogota", allow_remote=False)
    assert r and r.get("aproximado") and 4.0 < r["lat"] < 5.0, r
    r2 = geocode_direccion("Carrera 18 # 12", allow_remote=False)
    assert r2 and 7.0 < r2["lat"] < 7.2, r2
    print("ok", r["municipio"], r2["municipio"])
