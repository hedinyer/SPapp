#!/usr/bin/env python3
"""Enriquece motos sin pagos/aliado consultando Railway viaduct."""
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from explore_db_viaduct import get_connection  # noqa: E402

SUPABASE_URL = "https://rpjkwoxqnvwcnlnffudt.supabase.co"
SUPABASE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwamt3b3hxbnZ3Y25sbmZmdWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzOTc1MDAsImV4cCI6MjA5ODk3MzUwMH0.9i7zQyLxhudWUS87BlxxhliY6UUXJRgTSeOfOSJblP0"
)
OUT_SQL = Path(__file__).parent / "enrich-viaduct-updates.sql"


def fetch_motos_incompletas() -> list[dict]:
    url = (
        f"{SUPABASE_URL}/rest/v1/motos"
        "?select=id,placa,numero_serie,pagos,aliado,veces_vendida"
        "&or=(pagos.is.null,aliado.is.null)"
    )
    req = urllib.request.Request(
        url,
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        },
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


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

        cur.execute(
            "SELECT id FROM vehiculos_vehiculo WHERE upper(serie) = upper(%s) LIMIT 1;",
            (key,),
        )
        if row := cur.fetchone():
            return row[0]

        digits = re.sub(r"\D", "", key)
        if digits:
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
        "pagos": dias_pagados or 0,
        "veces_vendida": veces_vendida or 0,
    }


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def main() -> None:
    motos = fetch_motos_incompletas()
    conn = get_connection()
    cur = conn.cursor()

    lines: list[str] = []
    matched = 0
    unmatched: list[str] = []

    for moto in motos:
        ident = (moto.get("placa") or moto.get("numero_serie") or moto["id"]).upper()
        vid = buscar_vehiculo_id(cur, moto.get("placa"), moto.get("numero_serie"))
        if not vid:
            unmatched.append(ident)
            continue

        info = datos_vehiculo(cur, vid)
        if not info:
            unmatched.append(ident)
            continue

        sets: list[str] = []
        if moto.get("pagos") is None and info["pagos"] is not None:
            sets.append(f"pagos = {info['pagos']}")
        if moto.get("aliado") is None and info.get("aliado"):
            sets.append(f"aliado = {sql_literal(info['aliado'])}")
        if moto.get("veces_vendida") is None and info.get("veces_vendida") is not None:
            sets.append(f"veces_vendida = {info['veces_vendida']}")

        if not sets:
            continue

        lines.append(f"UPDATE public.motos SET {', '.join(sets)} WHERE id = '{moto['id']}';")
        matched += 1

    cur.close()
    conn.close()

    OUT_SQL.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
    print(f"Motos incompletas: {len(motos)}")
    print(f"Actualizadas: {matched}")
    print(f"Sin match viaduct: {len(unmatched)}")
    if unmatched:
        print("Sin match:", ", ".join(unmatched[:25]))


if __name__ == "__main__":
    main()
