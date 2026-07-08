"""Completa veces_vendida en motos que aún no lo tienen."""
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from explore_db_viaduct import get_connection  # noqa: E402

SUPABASE_URL = "https://rpjkwoxqnvwcnlnffudt.supabase.co"
KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwamt3b3hxbnZ3Y25sbmZmdWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzOTc1MDAsImV4cCI6MjA5ODk3MzUwMH0.9i7zQyLxhudWUS87BlxxhliY6UUXJRgTSeOfOSJblP0"
)


def fetch_sin_veces() -> list[dict]:
    url = f"{SUPABASE_URL}/rest/v1/motos?select=id,placa,numero_serie&veces_vendida=is.null"
    req = urllib.request.Request(
        url,
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"},
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def buscar_vehiculo_id(cur, placa, numero_serie):
    for key in filter(None, [placa, numero_serie]):
        key = key.strip().upper()
        cur.execute(
            "SELECT id FROM vehiculos_vehiculo WHERE upper(placa)=upper(%s) OR upper(serie)=upper(%s) LIMIT 1",
            (key, key),
        )
        if row := cur.fetchone():
            return row[0]
        digits = re.sub(r"\D", "", key)
        if digits:
            cur.execute(
                """
                SELECT id FROM vehiculos_vehiculo
                WHERE regexp_replace(coalesce(numero_chasis, ''), '[^0-9]', '', 'g') LIKE %s
                LIMIT 1
                """,
                (f"%{digits}%",),
            )
            if row := cur.fetchone():
                return row[0]
    return None


def patch_moto(moto_id: str, veces_vendida: int) -> None:
    url = f"{SUPABASE_URL}/rest/v1/motos?id=eq.{moto_id}"
    body = json.dumps({"veces_vendida": veces_vendida}).encode()
    req = urllib.request.Request(
        url,
        data=body,
        method="PATCH",
        headers={
            "apikey": KEY,
            "Authorization": f"Bearer {KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
    )
    with urllib.request.urlopen(req) as resp:
        resp.read()


def main():
    motos = fetch_sin_veces()
    conn = get_connection()
    cur = conn.cursor()
    updated = 0
    for m in motos:
        vid = buscar_vehiculo_id(cur, m.get("placa"), m.get("numero_serie"))
        if not vid:
            continue
        cur.execute(
            "SELECT COUNT(*)::int FROM arrendamientos_contrato WHERE vehiculo_id = %s",
            (vid,),
        )
        vv = cur.fetchone()[0]
        patch_moto(m["id"], vv)
        updated += 1
    cur.close()
    conn.close()
    print(f"Actualizadas {updated} motos con veces_vendida")


if __name__ == "__main__":
    main()
