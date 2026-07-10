#!/usr/bin/env python3
"""Extrae clientes de viaduct con contratos, pagos y mora."""
from __future__ import annotations

import re
import sys
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from explore_db_viaduct import get_connection  # noqa: E402

SQL = """
SELECT
  cl.id AS cliente_id,
  cl.cedula,
  cl.nombre,
  cl.direccion,
  cl.telefono,
  cl.status,
  cl.tipo,
  c.id AS contrato_id,
  c.estado AS contrato_estado,
  c.tarifa,
  c.frecuencia_pago,
  c.fecha_inicio,
  v.placa,
  v.marca,
  v.modelo,
  COUNT(pf.id) FILTER (WHERE f.estado_pago = 'pendiente') AS facturas_pendientes,
  COALESCE(SUM(pf.valor), 0) AS total_pagado,
  MAX(pf.fecha_pago) AS ultimo_pago
FROM clientes_cliente cl
LEFT JOIN arrendamientos_contrato c
  ON c.cliente_id = cl.id AND c.estado = 'Activo'
LEFT JOIN vehiculos_vehiculo v ON v.id = c.vehiculo_id
LEFT JOIN terminal_pagos_factura f ON f.contrato_id = c.id
LEFT JOIN terminal_pagos_pagofactura pf ON pf.factura_id = f.id
WHERE cl.direccion IS NOT NULL AND trim(cl.direccion) <> ''
GROUP BY cl.id, c.id, v.id, cl.cedula, cl.nombre, cl.direccion, cl.telefono,
         cl.status, cl.tipo, c.estado, c.tarifa, c.frecuencia_pago, c.fecha_inicio,
         v.placa, v.marca, v.modelo
ORDER BY cl.id;
"""


def normalizar_cedula(cedula: str | None) -> str:
    if not cedula:
        return ""
    return re.sub(r"\D", "", cedula.strip())


def dias_sin_pago(ultimo_pago) -> int | None:
    if ultimo_pago is None:
        return None
    if isinstance(ultimo_pago, datetime):
        ultimo = ultimo_pago.date()
    elif isinstance(ultimo_pago, date):
        ultimo = ultimo_pago
    else:
        return None
    return (date.today() - ultimo).days


def extract_viaduct() -> list[dict]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL)
    cols = [d[0] for d in cur.description]
    rows = [dict(zip(cols, row)) for row in cur.fetchall()]
    cur.close()
    conn.close()

    out: list[dict] = []
    for r in rows:
        tarifa = float(r["tarifa"]) if r.get("tarifa") is not None else None
        out.append(
            {
                "cliente_id": r["cliente_id"],
                "cedula": normalizar_cedula(r.get("cedula")),
                "cedula_raw": r.get("cedula"),
                "nombre": r.get("nombre") or "",
                "direccion": (r.get("direccion") or "").strip(),
                "telefono": r.get("telefono"),
                "status": r.get("status"),
                "tipo": r.get("tipo"),
                "contrato_id": r.get("contrato_id"),
                "contrato_estado": r.get("contrato_estado"),
                "tarifa": tarifa,
                "frecuencia_pago": r.get("frecuencia_pago"),
                "fecha_inicio_contrato": (
                    r["fecha_inicio"].isoformat()
                    if r.get("fecha_inicio")
                    else None
                ),
                "placa": r.get("placa"),
                "marca": r.get("marca"),
                "modelo": r.get("modelo"),
                "facturas_pendientes": int(r.get("facturas_pendientes") or 0),
                "total_pagado": float(r.get("total_pagado") or 0),
                "ultimo_pago": (
                    r["ultimo_pago"].isoformat()
                    if r.get("ultimo_pago")
                    else None
                ),
                "dias_sin_pago": dias_sin_pago(r.get("ultimo_pago")),
                "es_activo": r.get("contrato_estado") == "Activo",
            }
        )
    return out


if __name__ == "__main__":
    data = extract_viaduct()
    print(f"Clientes viaduct: {len(data)}")
    if data:
        print(data[0])
