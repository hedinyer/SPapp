#!/usr/bin/env python3
"""Detecta municipio/depto en texto libre. ponytail: alias scan, sin API."""
from __future__ import annotations

import csv
import re
import unicodedata
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
DANE_CSV = DATA_DIR / "dane" / "municipios_indicadores.csv"

# Centroides aprox (capitales + área metropolitana BGA)
_CAPITALES: list[dict] = [
    {"municipio": "Bogotá", "depto": "Cundinamarca", "lat": 4.711, "lng": -74.0721,
     "aliases": ["bogota", "bogota dc", "bogota d c", "santa fe de bogota"]},
    {"municipio": "Medellín", "depto": "Antioquia", "lat": 6.2442, "lng": -75.5812,
     "aliases": ["medellin", "medellin antioquia"]},
    {"municipio": "Cali", "depto": "Valle del Cauca", "lat": 3.4516, "lng": -76.532,
     "aliases": ["cali", "santiago de cali"]},
    {"municipio": "Barranquilla", "depto": "Atlántico", "lat": 10.9639, "lng": -74.7964,
     "aliases": ["barranquilla"]},
    {"municipio": "Cartagena", "depto": "Bolívar", "lat": 10.391, "lng": -75.4794,
     "aliases": ["cartagena", "cartagena de indias"]},
    {"municipio": "Cúcuta", "depto": "Norte de Santander", "lat": 7.8939, "lng": -72.5078,
     "aliases": ["cucuta", "san jose de cucuta"]},
    {"municipio": "Bucaramanga", "depto": "Santander", "lat": 7.1254, "lng": -73.1198,
     "aliases": ["bucaramanga", "bucaramanga santander"]},
    {"municipio": "Floridablanca", "depto": "Santander", "lat": 7.0621, "lng": -73.0858,
     "aliases": ["floridablanca", "florida blanca"]},
    {"municipio": "Girón", "depto": "Santander", "lat": 7.0682, "lng": -73.1699,
     "aliases": ["giron"]},
    {"municipio": "Piedecuesta", "depto": "Santander", "lat": 6.9879, "lng": -73.0495,
     "aliases": ["piedecuesta"]},
    {"municipio": "Pereira", "depto": "Risaralda", "lat": 4.8133, "lng": -75.6961,
     "aliases": ["pereira"]},
    {"municipio": "Manizales", "depto": "Caldas", "lat": 5.0689, "lng": -75.5174,
     "aliases": ["manizales"]},
    {"municipio": "Ibagué", "depto": "Tolima", "lat": 4.4389, "lng": -75.2322,
     "aliases": ["ibague"]},
    {"municipio": "Villavicencio", "depto": "Meta", "lat": 4.142, "lng": -73.6266,
     "aliases": ["villavicencio"]},
    {"municipio": "Pasto", "depto": "Nariño", "lat": 1.2136, "lng": -77.2811,
     "aliases": ["pasto", "san juan de pasto"]},
    {"municipio": "Montería", "depto": "Córdoba", "lat": 8.7479, "lng": -75.8814,
     "aliases": ["monteria"]},
    {"municipio": "Neiva", "depto": "Huila", "lat": 2.9345, "lng": -75.2809,
     "aliases": ["neiva"]},
    {"municipio": "Armenia", "depto": "Quindío", "lat": 4.5339, "lng": -75.6811,
     "aliases": ["armenia"]},
    {"municipio": "Sincelejo", "depto": "Sucre", "lat": 9.3047, "lng": -75.3978,
     "aliases": ["sincelejo"]},
    {"municipio": "Valledupar", "depto": "Cesar", "lat": 10.4631, "lng": -73.2532,
     "aliases": ["valledupar"]},
    {"municipio": "Santa Marta", "depto": "Magdalena", "lat": 11.2408, "lng": -74.199,
     "aliases": ["santa marta"]},
    {"municipio": "Soacha", "depto": "Cundinamarca", "lat": 4.5872, "lng": -74.2216,
     "aliases": ["soacha"]},
    {"municipio": "Bello", "depto": "Antioquia", "lat": 6.3369, "lng": -75.5581,
     "aliases": ["bello"]},
    {"municipio": "Soledad", "depto": "Atlántico", "lat": 10.9174, "lng": -74.7647,
     "aliases": ["soledad"]},
    {"municipio": "Rionegro", "depto": "Santander", "lat": 6.1557, "lng": -73.3838,
     "aliases": ["rionegro santander"]},
    {"municipio": "Lebrija", "depto": "Santander", "lat": 7.1133, "lng": -73.2178,
     "aliases": ["lebrija"]},
]


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def _compact(s: str) -> str:
    return s.replace(" ", "")


def _load_santander_csv() -> list[dict]:
    out: list[dict] = []
    if not DANE_CSV.exists():
        return out
    seen: set[str] = set()
    with DANE_CSV.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            nombre = row["nombre_municipio"]
            key = _norm(nombre)
            if key in seen:
                continue
            seen.add(key)
            # ponytail: sin centroide por fila; infer_lugar solo aporta nombre/depto
            out.append(
                {
                    "municipio": nombre,
                    "depto": row["departamento"],
                    "lat": None,
                    "lng": None,
                    "aliases": [key, _compact(key)],
                }
            )
    return out


def _index_places() -> list[tuple[str, dict]]:
    indexed: list[tuple[str, dict]] = []
    for p in _CAPITALES + _load_santander_csv():
        base = {
            "municipio": p["municipio"],
            "depto": p["depto"],
            "lat": p.get("lat"),
            "lng": p.get("lng"),
        }
        for alias in p["aliases"]:
            indexed.append((alias, base))
    indexed.sort(key=lambda x: len(x[0]), reverse=True)
    return indexed


_PLACES = _index_places()


def infer_lugar(text: str) -> dict | None:
    """Mejor coincidencia por alias más largo en dirección/barrio."""
    norm = _norm(text or "")
    compact = _compact(norm)
    if not norm:
        return None
    for alias, lugar in _PLACES:
        if alias in norm or alias in compact:
            return dict(lugar)
    return None


def geocode_suffix(direccion: str, barrio: str | None = None) -> str:
    lugar = infer_lugar(direccion) or infer_lugar(barrio or "")
    if lugar:
        return f"{lugar['municipio']}, {lugar['depto']}, Colombia"
    # ponytail: sin ciudad en texto → metro BGA (mayoría viaduct); no mezclar con Bogotá
    return "Bucaramanga, Santander, Colombia"


def _demo() -> None:
    bog = infer_lugar("Calle 31B Sur Bogota")
    assert bog and bog["municipio"] == "Bogotá", bog
    fl = infer_lugar("Balcon Del Lago Floridablanca")
    assert fl and fl["municipio"] == "Floridablanca", fl
  # conflicto: último alias largo gana — floridablanca antes que bogota en dirección mixta
    mix = infer_lugar("Florida Blanca Bogota")
    assert mix and mix["municipio"] in ("Floridablanca", "Bogotá"), mix


if __name__ == "__main__":
    _demo()
    print("ok", infer_lugar("Calle 1 Medellin"))
