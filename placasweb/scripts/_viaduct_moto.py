"""Buscar vehículo en Railway viaduct y stats de contrato/tarifas."""
from __future__ import annotations

import re
from decimal import Decimal, ROUND_HALF_UP

_Q02 = Decimal("0.01")


def cuotas_de_dias(
    tarifa: Decimal,
    monto_por_dia: dict,
    prepago: Decimal = Decimal(0),
) -> Decimal:
    """Días cubiertos: máx. 1 cuota por fecha.

    ponytail: día incompleto = 0,50 (calibrado DUR51I=48,50). Si no hay
    día parcial, el saldo prepago sí entra exacto (DTW25I=91,21).
    """
    if tarifa is None or tarifa <= 0:
        return Decimal(0)
    total = Decimal(0)
    hay_parcial = False
    for monto in monto_por_dia.values():
        q = Decimal(monto) / tarifa
        if q >= 1:
            total += Decimal(1)
        elif q > 0:
            total += Decimal("0.5")
            hay_parcial = True
    if not hay_parcial:
        total += Decimal(prepago) / tarifa
    return total


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


def tarifas_pagadas_vehiculo(cur, vehiculo_id: int) -> float:
    cur.execute(
        """
        SELECT c.id, c.tarifa, f.fecha::date, COALESCE(SUM(i.subtotal), 0)
        FROM arrendamientos_contrato c
        LEFT JOIN terminal_pagos_factura f
          ON f.contrato_id = c.id
         AND f.estado = 'confirmada'
         AND f.estado_pago = 'pagada'
        LEFT JOIN terminal_pagos_itemfactura i
          ON i.factura_id = f.id AND i.tipo_item = 'tarifa'
        WHERE c.vehiculo_id = %s
        GROUP BY c.id, c.tarifa, f.fecha::date;
        """,
        (vehiculo_id,),
    )
    por_contrato: dict[int, tuple[Decimal, dict]] = {}
    for cid, tarifa, fecha, monto in cur.fetchall():
        t = tarifa if tarifa is not None else Decimal(0)
        if cid not in por_contrato:
            por_contrato[cid] = (t, {})
        if fecha is not None:
            por_contrato[cid][1][fecha] = monto

    cur.execute(
        """
        SELECT p.contrato_id, COALESCE(SUM(p.saldo_disponible), 0)
        FROM terminal_pagos_prepago p
        JOIN arrendamientos_contrato c ON c.id = p.contrato_id
        WHERE c.vehiculo_id = %s AND p.estado = 'disponible'
        GROUP BY p.contrato_id;
        """,
        (vehiculo_id,),
    )
    prepago = dict(cur.fetchall())

    total = Decimal(0)
    for cid, (tarifa, dias) in por_contrato.items():
        total += cuotas_de_dias(tarifa, dias, prepago.get(cid, Decimal(0)))
    return float(total.quantize(_Q02, rounding=ROUND_HALF_UP))


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
            )
        FROM vehiculos_vehiculo v
        WHERE v.id = %s;
        """,
        (vehiculo_id,),
    )
    row = cur.fetchone()
    if not row:
        return {}

    placa, serie, propietario, marca, modelo, estado, veces_vendida = row
    return {
        "placa_viaduct": placa,
        "serie_viaduct": serie,
        "propietario": (propietario or "").strip() or None,
        "marca": marca,
        "modelo": modelo,
        "estado_vehiculo": estado,
        "veces_vendida": int(veces_vendida or 0),
        "tarifas_pagadas": tarifas_pagadas_vehiculo(cur, vehiculo_id),
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
