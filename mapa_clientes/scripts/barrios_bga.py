#!/usr/bin/env python3
"""Barrios de Bucaramanga: parseo regex + centroides."""
from __future__ import annotations

import re
import unicodedata

_BARRIOS: dict[str, tuple[float, float]] = {
    "centro": (7.1193, -73.1227),
    "cabecera del llano": (7.0982, -73.1084),
    "la concordia": (7.1301, -73.1148),
    "san francisco": (7.1382, -73.1095),
    "la ciudadela": (7.1125, -73.1068),
    "norte": (7.1450, -73.1080),
    "nororiente": (7.1420, -73.0980),
    "niza": (7.1455, -73.0995),
    "ciudadela real de minas": (7.1080, -73.1040),
    "provenza": (7.0785, -73.1052),
    "la pedregosa": (7.1055, -73.0948),
    "lagos del cacique": (7.0948, -73.1115),
    "morga": (7.1150, -73.1305),
    "libertadores": (7.1102, -73.1250),
    "antonia santos": (7.1255, -73.1178),
    "el prado": (7.1005, -73.1145),
    "independencia": (7.1080, -73.1285),
    "independencias": (7.1080, -73.1285),
    "monterredondo": (7.0850, -73.0980),
    "zapamanga": (7.1420, -73.0880),
    "balcones del sur": (7.0680, -73.1150),
    "villa ines": (7.1320, -73.1050),
    "los sauces": (7.0550, -73.1080),
    "villa alsacia": (7.1000, -73.1020),
    "villa alsalsia": (7.1000, -73.1020),
    "las palmitas": (7.0480, -73.0950),
    "tibabuyes": (7.1380, -73.1350),
    "veragua": (7.1120, -73.1180),
    "serafina": (7.0750, -73.1200),
    "cristal alto": (7.1050, -73.1100),
    "cristal bajo": (7.1030, -73.1130),
    "la joya": (7.1150, -73.1250),
    "camilo torres": (7.1220, -73.1160),
    "gaitan": (7.1280, -73.1120),
    "delicias": (7.1180, -73.1080),
    "el rocio": (7.1350, -73.0920),
    "luz de salvacion": (7.1080, -73.1050),
    "convivir": (7.1100, -73.1000),
    "garcia rovira": (7.1250, -73.1220),
    "sotomayor": (7.1160, -73.1190),
    "la aurora": (7.0920, -73.1180),
    "tejar": (7.0880, -73.1220),
    "villa maria": (7.0920, -73.1185),
    "mutis": (7.1355, -73.1180),
    "alto del medio": (7.1180, -73.1280),
    "villa helenita": (7.1020, -73.1080),
    "villa helenia": (7.1020, -73.1080),
    "el bosque": (7.1280, -73.1050),
    "paraguitas": (7.1050, -73.1200),
    "parque santander": (7.1195, -73.1220),
    "bavaria": (7.0980, -73.1150),
    "bavaria ii": (7.0975, -73.1145),
    "granjas julio rincon": (7.1120, -73.1320),
    "granja julio rincon": (7.1120, -73.1320),
    "fagua": (7.1500, -73.0800),
    "chiquilinda": (7.1480, -73.0820),
    "villa carolina": (7.0880, -73.1100),
    "villa carolina ii": (7.0875, -73.1095),
    "los almendros": (7.0950, -73.1050),
    "el eden": (7.0800, -73.1250),
    "puerto cabrera": (7.1050, -73.1350),
    "san antonio": (7.1150, -73.1180),
    "simon bolivar": (7.1200, -73.1150),
    "buenos aires": (7.1080, -73.1120),
    "kennedy": (7.1000, -73.1200),
    "lizcano": (7.1380, -73.1120),
    "lizcano 2 norte": (7.1390, -73.1110),
    "renania": (7.0950, -73.1180),
    "villa del sur": (7.0650, -73.1120),
    "sanjose de cacique": (7.0940, -73.1100),
    "valle san jose": (7.0900, -73.1050),
    "balcon del lago": (7.0900, -73.0850),
    "amaga": (7.1020, -73.1180),
    "villa ines": (7.1320, -73.1050),
    "el cerrito": (7.1100, -73.1250),
    "ciudadela": (7.1125, -73.1068),
    "real de minas": (7.1080, -73.1040),
    "cabecera": (7.0982, -73.1084),
    "lago": (7.0948, -73.1115),
    "rocio": (7.1350, -73.0920),
}

# ponytail: nombres cortos solo cuentan tras "barrio" (evita "30B Norte")
_GENERICOS = frozenset(
    {
        "norte",
        "niza",
        "centro",
        "tejar",
        "mutis",
        "gaitan",
        "eden",
        "bosque",
        "prado",
        "lago",
        "rocio",
        "cabecera",
        "amaga",
        "ciudadela",
    }
)

_ALIASES: list[tuple[str, str]] = []
for key in _BARRIOS:
    _ALIASES.append((key, key))
    c = key.replace(" ", "")
    if c != key:
        _ALIASES.append((c, key))
_ALIASES.sort(key=lambda x: len(x[0]), reverse=True)

_OTRAS_CIUDADES = (
    "bogota",
    "medellin",
    "cali",
    "barranquilla",
    "cucuta",
    "floridablanca",
    "giron",
    "piedecuesta",
    "lebrija",
    "san gil",
    "barrancabermeja",
    "cajica",
    "soacha",
    "girardot",
    "cundinamarca",
    "mesa de los santos",
)

_RE_BARRIO = re.compile(
    r"barrio\s+(.+?)(?:\s+de\s+la\s+ciudad(?:\s+de)?|\s+de\s+bucaramanga|\s+bucaramanga|,|\.|$)",
    re.IGNORECASE,
)
_RE_BARRIO_LOOSE = re.compile(
    r"barrio\s+(.+?)(?:\s*,|\s+de\s+|\s+casa|\s+#|$)",
    re.IGNORECASE,
)
_RE_SECTOR = re.compile(
    r"sector\s+(.+?)(?:\s+casa|,|\.|$)",
    re.IGNORECASE,
)
_RE_URB = re.compile(
    r"urbanizacion\s+(.+?)(?:\s|,|\.|$)",
    re.IGNORECASE,
)


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def _compact(s: str) -> str:
    return s.replace(" ", "")


def _hit(key: str) -> dict:
    lat, lng = _BARRIOS[key]
    return {
        "barrio": key.title(),
        "barrio_key": key,
        "municipio": "Bucaramanga",
        "departamento": "Santander",
        "lat": lat,
        "lng": lng,
    }


def _match_alias(alias: str, key: str, norm: str, compact: str, *, barrio_ctx: bool) -> bool:
    if alias in _GENERICOS and not barrio_ctx:
        return False
    if " " in alias:
        return alias in norm or alias.replace(" ", "") in compact
    pat = re.compile(rf"(?:^|\s|barrio\s+){re.escape(alias)}(?:\s|$)")
    return bool(pat.search(norm))


def _resolve_phrase(phrase: str) -> dict | None:
    pn = _norm(phrase)
    pc = _compact(pn)
    for alias, key in _ALIASES:
        if _match_alias(alias, key, pn, pc, barrio_ctx=True):
            return _hit(key)
    return None


def extract_barrio_phrases(text: str) -> list[str]:
    if not text:
        return []
    out: list[str] = []
    for rx in (_RE_BARRIO, _RE_BARRIO_LOOSE, _RE_SECTOR, _RE_URB):
        for m in rx.finditer(text):
            phrase = m.group(1).strip()
            phrase = re.sub(r"\s+de\s+.*$", "", phrase, flags=re.IGNORECASE)
            if len(phrase) >= 3:
                out.append(phrase)
    return out


def parse_barrio_bga(direccion: str | None, barrio_extra: str | None = None) -> dict | None:
    """Regex + catálogo BGA. None si no hay barrio reconocible."""
    partes = [direccion or "", barrio_extra or ""]
    texto = " ".join(p for p in partes if p).strip()
    if not texto:
        return None

    for phrase in extract_barrio_phrases(texto):
        if r := _resolve_phrase(phrase):
            return r

    norm = _norm(texto)
    compact = _compact(norm)
    barrio_ctx = "barrio" in norm

    for alias, key in _ALIASES:
        if _match_alias(alias, key, norm, compact, barrio_ctx=barrio_ctx):
            return _hit(key)

    return None


def tiene_barrio_bga(direccion: str | None, barrio_extra: str | None = None) -> bool:
    return parse_barrio_bga(direccion, barrio_extra) is not None


def lookup_barrio(text: str) -> dict | None:
    return parse_barrio_bga(text)


def excluir_por_nombre(nombre: str | None) -> bool:
    if not nombre:
        return False
    norm = _norm(nombre)
    return "bogota" in norm or "chia" in norm


def es_bucaramanga(direccion: str, barrio_extra: str | None = None) -> bool:
    """Otra ciudad en texto → False. Si no, requiere barrio BGA parseado."""
    texto = f"{direccion or ''} {barrio_extra or ''}"
    norm = _norm(texto)
    compact = _compact(norm)
    for ciudad in _OTRAS_CIUDADES:
        if ciudad in norm or ciudad in compact:
            return False
    return tiene_barrio_bga(direccion, barrio_extra)


def _demo() -> None:
    r = parse_barrio_bga("Carrera 23 # 3-66 Barrio Independencia De Bucaramanga")
    assert r and r["barrio_key"] == "independencia", r
    assert parse_barrio_bga("Carrera 98 # 30B Norte 08") is None
    assert parse_barrio_bga("Barrio La Joya")["barrio_key"] == "la joya"
    assert not es_bucaramanga("Calle 10 #40-50")
    assert es_bucaramanga("Calle 10 Barrio Centro Bucaramanga")


if __name__ == "__main__":
    _demo()
    print("ok", parse_barrio_bga("Carrera 18 Barrio Los Sauces"))
