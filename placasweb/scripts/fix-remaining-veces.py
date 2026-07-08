import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from explore_db_viaduct import get_connection

IDS = {
    "ALK59C": "df302de0-c55b-44a5-908e-6f96664a29e5",
    "GAR68H": "cdecd510-e6b5-4b1c-9905-709c5f9e3dfd",
    "HLB79H": "e14e0f9f-c763-4696-9414-5807b7bf2d97",
    "OSP29H": "0bba2970-ec4e-4f9d-ba0f-e7d8b82d6c4b",
    "OSQ65H": "a17e0b99-e881-4692-912a-411899c66ae1",
    "OSR73H": "2e470045-4279-4652-ad5f-3c950f892884",
    "RBA93H": "4fd21579-e552-4b47-8b50-61e61abd61aa",
    "RBH89H": "ccdd4fb5-1b55-40ce-869e-99bbae618106",
    "TIN92H": "f2822314-3686-4855-8a2f-68dca3b6773d",
    "TSC22H": "4c1daf16-49ac-4621-b3bc-c1c6a1ef05c1",
    "TTO98H": "213dea29-7043-491d-a37b-026c0a90b2c0",
    "ZPL69H": "f06e5cd3-b539-41d2-835a-24e57f746b95",
    "ZPZ83H": "93c4df54-0f00-4a24-a9cf-d210d75f070c",
}

conn = get_connection()
cur = conn.cursor()
for placa, mid in IDS.items():
    cur.execute(
        "SELECT id FROM vehiculos_vehiculo WHERE upper(placa) = upper(%s)",
        (placa,),
    )
    row = cur.fetchone()
    if not row:
        continue
    cur.execute(
        "SELECT COUNT(*)::int FROM arrendamientos_contrato WHERE vehiculo_id = %s",
        (row[0],),
    )
    vv = cur.fetchone()[0]
    print(f"UPDATE public.motos SET veces_vendida = {vv} WHERE id = '{mid}';")
cur.close()
conn.close()
