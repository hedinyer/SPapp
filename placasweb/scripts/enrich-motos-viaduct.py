#!/usr/bin/env python3
"""Rellena pagos/aliado/veces_vendida en motos incompletas desde Railway viaduct
y aplica el PATCH directo a Supabase.
"""
from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from explore_db_viaduct import get_connection  # noqa: E402

SUPABASE_URL = "https://rpjkwoxqnvwcnlnffudt.supabase.co"
SUPABASE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwamt3b3hxbnZ3Y25sbmZmdWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzOTc1MDAsImV4cCI6MjA5ODk3MzUwMH0.9i7zQyLxhudWUS87BlxxhliY6UUXJRgTSeOfOSJblP0"
)
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}
OUT_SQL = Path(__file__).parent / "enrich-viaduct-updates.sql"
ACTIVOS_JSON = Path(__file__).parent / "motos_credito_activo_2026-08-12.json"


def fetch_all_motos() -> list[dict]:
    rows: list[dict] = []
    offset = 0
    page = 1000
    while True:
        url = (
            f"{SUPABASE_URL}/rest/v1/motos"
            "?select=id,placa,numero_serie,pagos,aliado,veces_vendida"
            f"&order=created_at.asc&limit={page}&offset={offset}"
        )
        req = urllib.request.Request(url, headers={**HEADERS, "Prefer": "count=exact"})
        with urllib.request.urlopen(req) as resp:
            batch = json.loads(resp.read().decode())
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < page:
            break
        offset += page
    return rows


def incompleta(m: dict) -> bool:
    return m.get("pagos") is None or m.get("aliado") is None or m.get("veces_vendida") is None


def buscar_vehiculo_id(cur, placa: str | None, numero_serie: str | None) -> int | None:
    candidatos: list[str] = []
    if placa and placa.strip():
        candidatos.append(placa.strip().upper())
    if numero_serie and numero_serie.strip():
        candidatos.append(numero_serie.strip().upper())

    vistos: set[str] = set()
    for key in candidatos:
        if key in vistos:
            continue
        vistos.add(key)

        cur.execute(
            "SELECT id FROM vehiculos_vehiculo WHERE upper(placa) = upper(%s) LIMIT 1;",
            (key,),
        )
        if row := cur.fetchone():
            return row[0]

        # Placas a 5 chars (falta la letra final): ZPG10 -> ZPG10H
        if len(key) == 5 and re.fullmatch(r"[A-Z0-9]+", key):
            cur.execute(
                """
                SELECT id FROM vehiculos_vehiculo
                WHERE upper(placa) LIKE %s
                ORDER BY id
                LIMIT 2;
                """,
                (key + "%",),
            )
            rows = cur.fetchall()
            if len(rows) == 1:
                return rows[0][0]

        cur.execute(
            "SELECT id FROM vehiculos_vehiculo WHERE upper(coalesce(serie, '')) = upper(%s) LIMIT 1;",
            (key,),
        )
        if row := cur.fetchone():
            return row[0]

        digits = re.sub(r"\D", "", key)
        if len(digits) >= 5:
            cur.execute(
                """
                SELECT id FROM vehiculos_vehiculo
                WHERE regexp_replace(coalesce(numero_chasis, ''), '[^0-9]', '', 'g') LIKE %s
                LIMIT 1;
                """,
                (f"%{digits}%",),
            )
            if row := cur.fetchone():
                return row[0]
    return None


def datos_vehiculo(cur, vehiculo_id: int) -> dict:
    cur.execute(
        """
        SELECT
            v.propietario,
            (
                SELECT COUNT(*)::int FROM arrendamientos_contrato c
                WHERE c.vehiculo_id = v.id
            ),
            (
                SELECT COUNT(*)::int
                FROM arrendamientos_contrato c
                JOIN terminal_pagos_factura f ON f.contrato_id = c.id
                WHERE c.vehiculo_id = v.id
                  AND f.estado = 'confirmada'
                  AND f.estado_pago = 'pagada'
                  AND EXISTS (
                      SELECT 1 FROM terminal_pagos_itemfactura i
                      WHERE i.factura_id = f.id AND i.tipo_item = 'tarifa'
                  )
            )
        FROM vehiculos_vehiculo v
        WHERE v.id = %s;
        """,
        (vehiculo_id,),
    )
    row = cur.fetchone()
    if not row:
        return {}
    propietario, veces_vendida, dias_pagados = row
    return {
        "aliado": (propietario or "").strip() or None,
        "pagos": int(dias_pagados or 0),
        "veces_vendida": int(veces_vendida or 0),
    }


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def patch_moto(moto_id: str, payload: dict) -> None:
    body = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/motos?id=eq.{moto_id}",
        data=body,
        headers=HEADERS,
        method="PATCH",
    )
    with urllib.request.urlopen(req) as resp:
        resp.read()


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    excluir: set[str] = set()
    if ACTIVOS_JSON.exists():
        excluir = {r["moto_id"] for r in json.loads(ACTIVOS_JSON.read_text(encoding="utf-8"))}

    motos = [m for m in fetch_all_motos() if m["id"] not in excluir and incompleta(m)]
    print(f"Motos restantes incompletas (sin las 36 activas): {len(motos)}")

    conn = get_connection()
    cur = conn.cursor()

    lines: list[str] = []
    patched = 0
    unmatched: list[str] = []
    sin_cambio = 0

    for moto in motos:
        ident = (moto.get("placa") or moto.get("numero_serie") or moto["id"] or "?").upper()
        vid = buscar_vehiculo_id(cur, moto.get("placa"), moto.get("numero_serie"))
        if not vid:
            unmatched.append(ident)
            continue

        info = datos_vehiculo(cur, vid)
        if not info:
            unmatched.append(ident)
            continue

        payload: dict = {}
        sets: list[str] = []
        if moto.get("pagos") is None:
            payload["pagos"] = info["pagos"]
            sets.append(f"pagos = {info['pagos']}")
        if moto.get("aliado") is None and info.get("aliado"):
            payload["aliado"] = info["aliado"]
            sets.append(f"aliado = {sql_literal(info['aliado'])}")
        if moto.get("veces_vendida") is None:
            payload["veces_vendida"] = info["veces_vendida"]
            sets.append(f"veces_vendida = {info['veces_vendida']}")

        if not payload:
            sin_cambio += 1
            continue

        try:
            patch_moto(moto["id"], payload)
        except urllib.error.HTTPError as e:
            print(f"X PATCH {ident}: {e.code} {e.read()[:200]!r}")
            continue

        lines.append(f"UPDATE public.motos SET {', '.join(sets)} WHERE id = '{moto['id']}';")
        patched += 1

    cur.close()
    conn.close()

    OUT_SQL.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
    print(f"Actualizadas en Supabase: {patched}")
    print(f"Sin datos nuevos (p.ej. sin aliado en viaduct): {sin_cambio}")
    print(f"Sin match viaduct: {len(unmatched)}")
    if unmatched:
        print("Sin match:", ", ".join(unmatched[:40]))
    print(f"SQL log -> {OUT_SQL}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
