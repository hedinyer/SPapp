#!/usr/bin/env python3
"""Extrae GPS, direcciones y mora desde Supabase (spappweb)."""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
load_dotenv(ROOT / ".env")
load_dotenv(ROOT / "mapa_clientes" / ".env")

SUPABASE_URL = os.getenv(
    "SUPABASE_URL", "https://iilgrapnrkwdcouielwz.supabase.co"
).rstrip("/")
SUPABASE_KEY = os.getenv(
    "SUPABASE_SERVICE_ROLE_KEY",
    os.getenv(
        "SUPABASE_ANON_KEY",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbGdyYXBucmt3ZGNvdWllbHd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NDEyODEsImV4cCI6MjA5NjUxNzI4MX0.82GJcFxinFQqxI8OSh40JdivYWK9hr1GRw6lyiqW_3E",
    ),
)


def normalizar_cedula(cedula: str | None) -> str:
    if not cedula:
        return ""
    return re.sub(r"\D", "", cedula.strip())


def _fetch(path: str) -> list[dict]:
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    req = urllib.request.Request(
        url,
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode())


def _cedula_from_hoja(hoja: dict | None) -> str:
    if not hoja:
        return ""
    for key in ("numero_identificacion", "cedula", "documento"):
        val = hoja.get(key)
        if val:
            return normalizar_cedula(str(val))
    return ""


def extract_supabase() -> dict[str, dict]:
    """Retorna dict keyed por cédula normalizada."""
    users = _fetch("users?select=id,user")
    user_cedula: dict[int, str] = {}
    for u in users:
        uid = int(u["id"])
        user_cedula[uid] = normalizar_cedula(u.get("user"))

    contracts = _fetch(
        "digital_contracts?select=user_id,hoja_vida_data,contrato_data,status"
    )
    hoja_by_user: dict[int, dict] = {}
    for c in contracts:
        uid = int(c["user_id"])
        hoja = c.get("hoja_vida_data") or {}
        contrato = c.get("contrato_data") or {}
        cedula = (
            _cedula_from_hoja(hoja)
            or normalizar_cedula(contrato.get("cedula_contratante"))
            or user_cedula.get(uid, "")
        )
        if cedula:
            user_cedula[uid] = cedula
        hoja_by_user[uid] = {
            "direccion": (hoja.get("direccion") or "").strip(),
            "barrio": (hoja.get("barrio") or "").strip(),
            "celular": hoja.get("celular") or hoja.get("telefono"),
            "nombre": hoja.get("nombre_completo"),
            "cedula": cedula,
        }

    docs = _fetch(
        "users_documents?select=user_id,ubicacion_solicitud&ubicacion_solicitud=not.is.null"
    )
    gps_solicitud: dict[int, dict] = {}
    for d in docs:
        loc = d.get("ubicacion_solicitud")
        if loc and loc.get("lat") is not None and loc.get("lng") is not None:
            gps_solicitud[int(d["user_id"])] = {
                "lat": float(loc["lat"]),
                "lng": float(loc["lng"]),
            }

    visitas = _fetch(
        "visitas?select=user_id,cliente_nombre,direccion_visita,barrio,ubicacion_verificada,cliente_celular"
    )
    visita_by_user: dict[int, dict] = {}
    visita_by_cedula: dict[str, dict] = {}
    for v in visitas:
        uid = int(v["user_id"])
        loc = v.get("ubicacion_verificada")
        entry = {
            "direccion_visita": v.get("direccion_visita"),
            "barrio": v.get("barrio"),
            "cliente_nombre": v.get("cliente_nombre"),
            "celular": v.get("cliente_celular"),
            "gps": None,
        }
        if loc and loc.get("lat") is not None and loc.get("lng") is not None:
            entry["gps"] = {"lat": float(loc["lat"]), "lng": float(loc["lng"])}
        visita_by_user[uid] = entry
        ced = user_cedula.get(uid, "")
        if ced:
            visita_by_cedula[ced] = entry

    tarifas = _fetch(
        "tarifas_pagadas?select=user_id,estado,monto_esperado,monto_pagado,fecha_vencimiento"
    )
    mora_by_user: dict[int, dict] = {}
    for t in tarifas:
        uid = int(t["user_id"])
        agg = mora_by_user.setdefault(
            uid,
            {
                "tarifas_vencidas": 0,
                "tarifas_pendientes": 0,
                "monto_adeudado": 0,
                "dias_atraso_max": 0,
            },
        )
        estado = t.get("estado")
        esperado = int(t.get("monto_esperado") or 0)
        pagado = int(t.get("monto_pagado") or 0)
        if estado == "vencida":
            agg["tarifas_vencidas"] += 1
            agg["monto_adeudado"] += max(0, esperado - pagado)
        elif estado == "pendiente":
            agg["tarifas_pendientes"] += 1

    morosos = _fetch("morosos?select=user_id,dias_atraso,monto_adeudado,estado")
    for m in morosos:
        uid = int(m["user_id"])
        agg = mora_by_user.setdefault(
            uid,
            {
                "tarifas_vencidas": 0,
                "tarifas_pendientes": 0,
                "monto_adeudado": 0,
                "dias_atraso_max": 0,
            },
        )
        agg["dias_atraso_max"] = max(
            agg["dias_atraso_max"], int(m.get("dias_atraso") or 0)
        )
        agg["monto_adeudado"] = max(
            agg["monto_adeudado"], int(m.get("monto_adeudado") or 0)
        )

    by_cedula: dict[str, dict] = {}
    all_uids = set(user_cedula) | set(hoja_by_user) | set(gps_solicitud) | set(visita_by_user) | set(mora_by_user)
    for uid in all_uids:
        cedula = user_cedula.get(uid, "")
        if not cedula:
            continue
        hoja = hoja_by_user.get(uid, {})
        visita = visita_by_user.get(uid, {})
        mora = mora_by_user.get(uid, {})
        by_cedula[cedula] = {
            "user_id": uid,
            "cedula": cedula,
            "nombre_supabase": hoja.get("nombre") or visita.get("cliente_nombre"),
            "direccion_supabase": hoja.get("direccion") or visita.get("direccion_visita"),
            "barrio_supabase": hoja.get("barrio") or visita.get("barrio"),
            "celular_supabase": hoja.get("celular") or visita.get("celular"),
            "gps_visita": (visita.get("gps") if visita else None),
            "gps_solicitud": gps_solicitud.get(uid),
            "mora_dias": mora.get("dias_atraso_max", 0),
            "monto_adeudado_supabase": mora.get("monto_adeudado", 0),
            "tarifas_vencidas": mora.get("tarifas_vencidas", 0),
            "facturas_pendientes_supabase": mora.get("tarifas_pendientes", 0),
        }

    return by_cedula


if __name__ == "__main__":
    data = extract_supabase()
    print(f"Clientes Supabase por cédula: {len(data)}")
    if data:
        first = next(iter(data.values()))
        print(first)
