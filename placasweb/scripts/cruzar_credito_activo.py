#!/usr/bin/env python3
"""Cruza motos de placasweb (Supabase) con contratos Activos en Railway viaduct
al corte 2026-08-12. Exporta CSV + JSON de las que tienen credito/contrato activo.
"""
from __future__ import annotations

import csv
import json
import re
import sys
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from explore_db_viaduct import get_connection  # noqa: E402

SUPABASE_URL = "https://rpjkwoxqnvwcnlnffudt.supabase.co"
SUPABASE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwamt3b3hxbnZ3Y25sbmZmdWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzOTc1MDAsImV4cCI6MjA5ODk3MzUwMH0.9i7zQyLxhudWUS87BlxxhliY6UUXJRgTSeOfOSJblP0"
)
CORTE = date(2026, 8, 12)
OUT_DIR = Path(__file__).parent
OUT_CSV = OUT_DIR / "motos_credito_activo_2026-08-12.csv"
OUT_JSON = OUT_DIR / "motos_credito_activo_2026-08-12.json"


def fetch_all_motos() -> list[dict]:
    rows: list[dict] = []
    offset = 0
    page = 1000
    while True:
        url = (
            f"{SUPABASE_URL}/rest/v1/motos"
            "?select=id,placa,numero_serie,condicion,ubicacion,pagos,aliado,"
            "veces_vendida,foto_url,notas,created_at"
            f"&order=created_at.asc&limit={page}&offset={offset}"
        )
        req = urllib.request.Request(
            url,
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
            },
        )
        with urllib.request.urlopen(req) as resp:
            batch = json.loads(resp.read().decode())
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < page:
            break
        offset += page
    return rows


def buscar_vehiculo(cur, placa: str | None, numero_serie: str | None):
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
            """
            SELECT id, placa, serie, marca, modelo, propietario, estado
            FROM vehiculos_vehiculo
            WHERE upper(placa) = upper(%s)
            LIMIT 1;
            """,
            (key,),
        )
        if row := cur.fetchone():
            return row

        # Placas a 5 chars (falta la letra final): ZPG10 -> ZPG10H
        if len(key) == 5 and re.fullmatch(r"[A-Z0-9]+", key):
            cur.execute(
                """
                SELECT id, placa, serie, marca, modelo, propietario, estado
                FROM vehiculos_vehiculo
                WHERE upper(placa) LIKE %s
                ORDER BY id
                LIMIT 2;
                """,
                (key + "%",),
            )
            rows = cur.fetchall()
            if len(rows) == 1:
                return rows[0]

        cur.execute(
            """
            SELECT id, placa, serie, marca, modelo, propietario, estado
            FROM vehiculos_vehiculo
            WHERE upper(coalesce(serie, '')) = upper(%s)
            LIMIT 1;
            """,
            (key,),
        )
        if row := cur.fetchone():
            return row

        digits = re.sub(r"\D", "", key)
        if len(digits) >= 5:
            cur.execute(
                """
                SELECT id, placa, serie, marca, modelo, propietario, estado
                FROM vehiculos_vehiculo
                WHERE regexp_replace(coalesce(numero_chasis, ''), '[^0-9]', '', 'g') LIKE %s
                LIMIT 1;
                """,
                (f"%{digits}%",),
            )
            if row := cur.fetchone():
                return row
    return None


def contrato_activo_al_corte(cur, vehiculo_id: int, corte: date):
    """Contrato en estado Activo vigente al corte (inicio <= corte y sin cancelacion previa)."""
    cur.execute(
        """
        SELECT
            c.id,
            c.estado,
            c.fecha_inicio,
            c.tarifa,
            c.frecuencia_pago,
            c.tipo_contrato,
            c.dias_contrato,
            cl.nombre,
            cl.cedula,
            cl.telefono,
            (
                SELECT COUNT(*)::int
                FROM terminal_pagos_factura f
                WHERE f.contrato_id = c.id
                  AND f.estado = 'confirmada'
                  AND f.estado_pago = 'pagada'
                  AND EXISTS (
                      SELECT 1 FROM terminal_pagos_itemfactura i
                      WHERE i.factura_id = f.id AND i.tipo_item = 'tarifa'
                  )
            ) AS dias_pagados,
            (
                SELECT COUNT(*)::int
                FROM terminal_pagos_factura f
                WHERE f.contrato_id = c.id
                  AND f.estado = 'confirmada'
                  AND f.estado_pago = 'pendiente'
                  AND (f.total - f.total_pagado) > 0
                  AND EXISTS (
                      SELECT 1 FROM terminal_pagos_itemfactura i
                      WHERE i.factura_id = f.id AND i.tipo_item = 'tarifa'
                  )
            ) AS facturas_pendientes
        FROM arrendamientos_contrato c
        JOIN clientes_cliente cl ON cl.id = c.cliente_id
        WHERE c.vehiculo_id = %s
          AND c.estado = 'Activo'
          AND c.fecha_inicio <= %s
          AND (c.fecha_cancelacion IS NULL OR c.fecha_cancelacion::date > %s)
        ORDER BY c.id DESC
        LIMIT 1;
        """,
        (vehiculo_id, corte, corte),
    )
    return cur.fetchone()


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    print(f"Corte: {CORTE}")
    motos = fetch_all_motos()
    print(f"Motos en placasweb: {len(motos)}")

    conn = get_connection()
    cur = conn.cursor()

    # Diagnóstico rápido
    cur.execute(
        "SELECT estado, COUNT(*) FROM arrendamientos_contrato GROUP BY 1 ORDER BY 2 DESC;"
    )
    print("Estados contrato:", dict(cur.fetchall()))

    activos: list[dict] = []
    sin_match: list[str] = []
    sin_activo: list[str] = []

    for moto in motos:
        ident = (moto.get("placa") or moto.get("numero_serie") or moto["id"]).upper()
        veh = buscar_vehiculo(cur, moto.get("placa"), moto.get("numero_serie"))
        if not veh:
            sin_match.append(ident)
            continue

        vid, vplaca, vserie, marca, modelo, propietario, vestado = veh
        contrato = contrato_activo_al_corte(cur, vid, CORTE)
        if not contrato:
            sin_activo.append(ident)
            continue

        (
            cid,
            cestado,
            finicio,
            tarifa,
            frec,
            tipo,
            dias,
            cliente,
            cedula,
            telefono,
            dias_pagados,
            pend,
        ) = contrato

        activos.append(
            {
                "moto_id": moto["id"],
                "placa_placasweb": moto.get("placa"),
                "serie_placasweb": moto.get("numero_serie"),
                "ubicacion": moto.get("ubicacion"),
                "condicion": moto.get("condicion"),
                "foto_url": moto.get("foto_url"),
                "aliado_placasweb": moto.get("aliado"),
                "pagos_placasweb": moto.get("pagos"),
                "vehiculo_id": vid,
                "placa_viaduct": vplaca,
                "serie_viaduct": vserie,
                "marca": marca,
                "modelo": modelo,
                "propietario": propietario,
                "estado_vehiculo": vestado,
                "contrato_id": cid,
                "contrato_estado": cestado,
                "fecha_inicio": str(finicio),
                "tarifa": float(tarifa) if tarifa is not None else None,
                "frecuencia_pago": frec,
                "tipo_contrato": tipo,
                "dias_contrato": dias,
                "cliente": cliente,
                "cedula": cedula,
                "telefono": telefono,
                "dias_pagados": dias_pagados,
                "facturas_pendientes": pend,
            }
        )

    cur.close()
    conn.close()

    OUT_JSON.write_text(
        json.dumps(activos, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    if activos:
        with OUT_CSV.open("w", newline="", encoding="utf-8-sig") as f:
            w = csv.DictWriter(f, fieldnames=list(activos[0].keys()))
            w.writeheader()
            w.writerows(activos)

    print(f"Con credito/contrato ACTIVO al {CORTE}: {len(activos)}")
    print(f"Sin match en viaduct: {len(sin_match)}")
    print(f"Match pero sin contrato activo: {len(sin_activo)}")
    print(f"CSV -> {OUT_CSV}")
    print(f"JSON -> {OUT_JSON}")
    if sin_match[:15]:
        print("Sin match (muestra):", ", ".join(sin_match[:15]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
