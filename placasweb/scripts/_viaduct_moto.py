"""Buscar vehículo en Railway viaduct y stats de contrato/tarifas."""
from __future__ import annotations

import re


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
            v.placa,
            v.serie,
            v.propietario,
            v.marca,
            v.modelo,
            v.estado,
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

    placa, serie, propietario, marca, modelo, estado, veces_vendida, tarifas = row
    return {
        "placa_viaduct": placa,
        "serie_viaduct": serie,
        "propietario": (propietario or "").strip() or None,
        "marca": marca,
        "modelo": modelo,
        "estado_vehiculo": estado,
        "veces_vendida": int(veces_vendida or 0),
        "tarifas_pagadas": int(tarifas or 0),
    }


def contrato_activo(cur, vehiculo_id: int) -> dict | None:
    cur.execute(
        """
        SELECT c.id, c.estado, cl.nombre, cl.cedula, c.fecha_inicio, c.tarifa
        FROM arrendamientos_contrato c
        JOIN clientes_cliente cl ON cl.id = c.cliente_id
        WHERE c.vehiculo_id = %s AND c.estado = 'Activo'
        ORDER BY c.id DESC
        LIMIT 1;
        """,
        (vehiculo_id,),
    )
    row = cur.fetchone()
    if not row:
        return None
    cid, estado, nombre, cedula, finicio, tarifa = row
    return {
        "contrato_id": cid,
        "estado": estado,
        "cliente": nombre,
        "cedula": cedula,
        "fecha_inicio": str(finicio),
        "tarifa": float(tarifa) if tarifa is not None else None,
    }
