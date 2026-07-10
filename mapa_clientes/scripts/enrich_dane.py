#!/usr/bin/env python3
"""Enriquecimiento DANE: indicadores municipales + segmentos de campaña."""
from __future__ import annotations

import math
import re
import unicodedata
from datetime import date, datetime
from pathlib import Path

import pandas as pd

from ciudades_co import infer_lugar

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
DANE_CSV = DATA_DIR / "dane" / "municipios_indicadores.csv"

# ponytail: indicadores DANE solo en CSV local (hoy: Santander)
def _norm(s: str | None) -> str:
    if not s or not isinstance(s, str):
        return ""
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn").strip()


def load_dane_indicators() -> pd.DataFrame:
    if not DANE_CSV.exists():
        raise FileNotFoundError(f"Falta {DANE_CSV}")
    df = pd.read_csv(DANE_CSV, dtype={"codigo_dane": str})
    df["nombre_norm"] = df["nombre_municipio"].map(_norm)
    return df


def match_municipio_dane(
    municipio_nombre: str | None,
    departamento: str | None,
    df: pd.DataFrame,
) -> dict | None:
    if municipio_nombre:
        norm = _norm(municipio_nombre)
        hit = df[df["nombre_norm"] == norm]
        if not hit.empty:
            return hit.iloc[0].to_dict()
        if len(norm) >= 5:
            partial = df[df["nombre_norm"].str.contains(norm[:5], na=False)]
            if not partial.empty:
                return partial.iloc[0].to_dict()
    return None


def dias_contrato(fecha_inicio: str | None) -> int | None:
    if not fecha_inicio or not isinstance(fecha_inicio, str):
        return None
    try:
        inicio = date.fromisoformat(fecha_inicio[:10])
        return (date.today() - inicio).days
    except ValueError:
        return None


def compute_segmentos(df: pd.DataFrame) -> pd.DataFrame:
    tarifas = df["tarifa"].dropna()
    p75 = float(tarifas.quantile(0.75)) if len(tarifas) else 0

    barrio_counts = df["barrio_osm"].fillna("").value_counts()
    barrio_p75 = (
        float(barrio_counts.quantile(0.75)) if len(barrio_counts) else 0
    )

    segmentos: list[str] = []
    for _, row in df.iterrows():
        tags: list[str] = []
        tarifa = row.get("tarifa") or 0
        en_mora = bool(
            (row.get("facturas_pendientes") or 0) > 0
            or (row.get("mora_dias") or 0) > 0
            or (row.get("tarifas_vencidas") or 0) > 0
        )
        dias_c = dias_contrato(row.get("fecha_inicio_contrato"))
        total_pagado = row.get("total_pagado") or 0
        barrio = row.get("barrio_osm") or ""

        if tarifa > p75 and not en_mora:
            tags.append("alto_valor")
        if en_mora:
            tags.append("en_mora")
        if dias_c is not None and dias_c < 90:
            tags.append("nuevo")
        if barrio and barrio_counts.get(barrio, 0) > barrio_p75:
            tags.append("zona_caliente")
        if en_mora and total_pagado > 0:
            tags.append("recuperacion")

        segmentos.append("|".join(tags) if tags else "general")

    df = df.copy()
    df["segmento"] = segmentos
    return df


def enrich_records(records: list[dict]) -> list[dict]:
    dane = load_dane_indicators()
    df = pd.DataFrame(records)

    dane_cols = []
    for _, row in df.iterrows():
        geo = row.get("geocode")
        if not isinstance(geo, dict):
            geo = {}
        municipio = geo.get("municipio") or row.get("municipio")
        depto = geo.get("departamento") or row.get("departamento")
        if isinstance(municipio, str):
            municipio = municipio.strip() or None
        else:
            municipio = None
        if isinstance(depto, str):
            depto = depto.strip() or None
        else:
            depto = None
        barrio = (
            geo.get("barrio")
            or row.get("barrio_osm")
            or row.get("barrio_supabase")
        )
        direccion_txt = str(row.get("direccion") or row.get("direccion_supabase") or "")

        if not municipio:
            inferred = infer_lugar(direccion_txt) or infer_lugar(str(barrio or ""))
            if inferred:
                municipio = inferred["municipio"]
                depto = inferred["depto"]

        hit = match_municipio_dane(municipio, depto, dane)
        if hit:
            dane_cols.append(
                {
                    "dane_municipio": str(hit["codigo_dane"]),
                    "dane_departamento": "68",
                    "municipio_nombre": hit["nombre_municipio"],
                    "poblacion_municipio": int(hit["poblacion"]),
                    "nbi_municipio": float(hit["nbi_porcentaje"]),
                    "quintil_ingreso_muni": int(hit["quintil_ingreso"]),
                    "barrio_osm": barrio,
                }
            )
        else:
            dane_cols.append(
                {
                    "dane_municipio": None,
                    "dane_departamento": None,
                    "municipio_nombre": municipio,
                    "poblacion_municipio": None,
                    "nbi_municipio": None,
                    "quintil_ingreso_muni": None,
                    "barrio_osm": barrio,
                    "departamento_nombre": depto,
                }
            )

    dane_df = pd.DataFrame(dane_cols)
    if "barrio_osm" in df.columns:
        df = df.drop(columns=["barrio_osm"])
    merged = pd.concat([df.reset_index(drop=True), dane_df], axis=1)
    merged = compute_segmentos(merged)

    def clean(v):
        if v is None:
            return None
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            return None
        return v

    return [
        {k: clean(v) for k, v in row.items()}
        for row in merged.to_dict(orient="records")
    ]


if __name__ == "__main__":
    sample = [
        {
            "cedula": "123",
            "tarifa": 40000,
            "facturas_pendientes": 0,
            "mora_dias": 0,
            "lat": 7.12,
            "lng": -73.11,
            "geocode": {"municipio": "Bucaramanga", "departamento": "Santander"},
        }
    ]
    print(enrich_records(sample)[0])
