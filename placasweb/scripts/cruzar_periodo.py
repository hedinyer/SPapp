#!/usr/bin/env python3
"""Cruza motos de placasweb (período) con Railway viaduct y Supabase spappweb."""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from explore_db_viaduct import get_connection  # noqa: E402
from _viaduct_moto import buscar_vehiculo_id, contrato_activo, datos_vehiculo  # noqa: E402

PLACAS_URL = "https://rpjkwoxqnvwcnlnffudt.supabase.co"
PLACAS_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwamt3b3hxbnZ3Y25sbmZmdWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzOTc1MDAsImV4cCI6MjA5ODk3MzUwMH0.9i7zQyLxhudWUS87BlxxhliY6UUXJRgTSeOfOSJblP0"
)
BOGOTA = ZoneInfo("America/Bogota")


def load_spapp_env() -> tuple[str, str]:
    env_path = ROOT / "spappweb" / ".env.local"
    url = os.getenv("SPAPP_SUPABASE_URL", "")
    key = os.getenv("SPAPP_SUPABASE_KEY", "")
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            if k == "NEXT_PUBLIC_SUPABASE_URL" and not url:
                url = v.strip()
            if k == "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" and not key:
                key = v.strip()
            if k == "NEXT_PUBLIC_SUPABASE_ANON_KEY" and not key:
                key = v.strip()
    return url, key


def fecha_bogota(iso: str) -> str:
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return dt.astimezone(BOGOTA).strftime("%Y-%m-%d")


def fetch_motos_periodo(desde: str, hasta: str) -> list[dict]:
    rows: list[dict] = []
    offset = 0
    page = 1000
    headers = {"apikey": PLACAS_KEY, "Authorization": f"Bearer {PLACAS_KEY}"}
    while True:
        url = (
            f"{PLACAS_URL}/rest/v1/motos"
            "?select=id,placa,numero_serie,condicion,ubicacion,pagos,aliado,veces_vendida,updated_at"
            f"&updated_at=gte.{desde}T00:00:00"
            f"&updated_at=lt.2026-09-02T00:00:00"
            f"&order=updated_at.asc&limit={page}&offset={offset}"
        )
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as resp:
            batch = json.loads(resp.read().decode())
        if not batch:
            break
        rows.extend(m for m in batch if desde <= fecha_bogota(m["updated_at"]) <= hasta)
        if len(batch) < page:
            break
        offset += page
    return rows


def supabase_tarifas_por_placa(
    spapp_url: str, spapp_key: str, placa: str | None, numero_serie: str | None
) -> dict | None:
    if not spapp_url or not spapp_key:
        return None
    ident = (placa or numero_serie or "").strip().upper()
    if not ident:
        return None

    headers = {
        "apikey": spapp_key,
        "Authorization": f"Bearer {spapp_key}",
    }
    q = urllib.parse.quote(ident)
    url = (
        f"{spapp_url.rstrip('/')}/rest/v1/user_moto_compra"
        f"?or=(placa.ilike.{q},chasis.ilike.{q})"
        "&select=id,placa,chasis,estado,tarifas_pagadas(estado)"
    )
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            compras = json.loads(resp.read().decode())
    except Exception:
        return None

    if not compras:
        return None

    tarifas_pagadas = 0
    tarifas_total = 0
    for compra in compras:
        for t in compra.get("tarifas_pagadas") or []:
            tarifas_total += 1
            if t.get("estado") == "pagada":
                tarifas_pagadas += 1

    return {
        "compras": len(compras),
        "tarifas_pagadas": tarifas_pagadas,
        "tarifas_total": tarifas_total,
        "estados_compra": sorted({c.get("estado") for c in compras if c.get("estado")}),
    }


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    parser = argparse.ArgumentParser()
    parser.add_argument("--desde", default="2026-08-23")
    parser.add_argument("--hasta", default="2026-08-31")
    parser.add_argument(
        "--out",
        default=str(
            Path(__file__).resolve().parents[1] / "public" / "data" / "cruce-periodo-agosto.json"
        ),
    )
    args = parser.parse_args()

    motos = fetch_motos_periodo(args.desde, args.hasta)
    print(f"Motos en período {args.desde}…{args.hasta}: {len(motos)}")

    spapp_url, spapp_key = load_spapp_env()
    conn = get_connection()
    cur = conn.cursor()

    cruce: dict[str, dict] = {}
    sin_viaduct = 0
    sin_spapp = 0

    for moto in motos:
        mid = moto["id"]
        vid = buscar_vehiculo_id(cur, moto.get("placa"), moto.get("numero_serie"))
        viaduct = None
        if vid:
            info = datos_vehiculo(cur, vid)
            activo = contrato_activo(cur, vid)
            viaduct = {
                "vehiculo_id": vid,
                **info,
                "contrato_activo": activo,
            }
        else:
            sin_viaduct += 1

        spapp = supabase_tarifas_por_placa(
            spapp_url, spapp_key, moto.get("placa"), moto.get("numero_serie")
        )
        if spapp is None and spapp_url:
            sin_spapp += 1

        cruce[mid] = {
            "placa": moto.get("placa"),
            "numero_serie": moto.get("numero_serie"),
            "placasweb": {
                "pagos": moto.get("pagos"),
                "aliado": moto.get("aliado"),
                "veces_vendida": moto.get("veces_vendida"),
            },
            "viaduct": viaduct,
            "spappweb": spapp,
        }

    cur.close()
    conn.close()

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generado": datetime.now(timezone.utc).isoformat(),
        "periodo": {"desde": args.desde, "hasta": args.hasta},
        "resumen": {
            "total": len(motos),
            "sin_viaduct": sin_viaduct,
            "sin_spappweb": sin_spapp,
        },
        "motos": cruce,
    }
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Sin match viaduct: {sin_viaduct}")
    print(f"Sin match spappweb: {sin_spapp}")
    print(f"JSON -> {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
