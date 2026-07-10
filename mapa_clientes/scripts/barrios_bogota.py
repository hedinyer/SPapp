#!/usr/bin/env python3
"""Barrios y localidades de Bogotá → excluir de dataset BGA."""
from __future__ import annotations

import re
import unicodedata

# Localidades + barrios propios de Bogotá (no genéricos como "centro")
_MARCAS_BOGOTA: tuple[str, ...] = (
    "bogota",
    "santa fe de bogota",
    "suba",
    "engativa",
    "fontibon",
    "bosa",
    "usme",
    "usaquen",
    "tunjuelito",
    "ciudad bolivar",
    "san cristobal",
    "rafael uribe",
    "antonio narino",
    "puente aranda",
    "teusaquillo",
    "barrios unidos",
    "los martires",
    "la candelaria",
    "sumapaz",
    "restrepo",
    "marandu",
    "luis carlos galan",
    "galan ciudad",
    "modelia",
    "salitre",
    "gran estacion",
    "monserrate",
    "ingermar",
    "brasilia bosa",
    "bosa brasilia",
    "suba bilbao",
    "suba rincon",
    "suba rincón",
    "san carlos suba",
    "kennedy occidental",
    "kennedy central",
    "molinos norte",
    "holanda",
    "pasadena",
    "marsella",
    "policarpa",
    "renania kennedy",
    "kenedy bogota",
    "localidad kennedy",
    "localidad suba",
    "localidad bosa",
    "localidad engativa",
    "localidad usaquen",
    "localidad chapinero",
    "chapinero alto",
    "chapinero central",
    "norte chapinero",
    "sur chapinero",
    "cundinamarca bogota",
    "dc bogota",
    "distrito capital",
)

# ordenar más largo primero
_MARCAS = sorted(_MARCAS_BOGOTA, key=len, reverse=True)


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def _compact(s: str) -> str:
    return s.replace(" ", "")


def excluir_por_direccion_bogota(
    direccion: str | None, barrio_extra: str | None = None
) -> bool:
    """True si dirección/barrio apunta a Bogotá."""
    texto = f"{direccion or ''} {barrio_extra or ''}"
    norm = _norm(texto)
    compact = _compact(norm)
    if not norm:
        return False

    if "bucaramanga" in norm or "floridablanca" in norm or "giron" in norm:
        # chapinero/kennedy existen en BGA con ciudad explícita
        pass
    elif "girardot" in norm:
        return False

    for marca in _MARCAS:
        if marca in norm or marca in compact:
            return True

    # chapinero sin Bucaramanga → Bogotá
    if "chapinero" in norm and "bucaramanga" not in norm:
        return True

    # kennedy sin BGA explícito (Manzana X casa Y Kennedy = patrón Bogotá)
    if "kennedy" in norm and "bucaramanga" not in norm:
        if re.search(r"manzana\s+\d+.*kennedy", norm):
            return True
        if "cundinamarca" in norm or "bogota" in compact:
            return True
        if "barrio kennedy" in norm and "de la ciudad de bucaramanga" not in norm:
            return True

    return False


def _demo() -> None:
    assert excluir_por_direccion_bogota("Calle 58 Chapinero Ingermar")
    assert excluir_por_direccion_bogota("Carrera 88B Bosa Brasilia")
    assert excluir_por_direccion_bogota("Manzana 34 casa 17 Kennedy")
    assert not excluir_por_direccion_bogota(
        "Carrera 14 Barrio Kennedy De La Ciudad De Bucaramanga"
    )
    assert not excluir_por_direccion_bogota("Calle 8 Chapinero Norte Bucaramanga")


if __name__ == "__main__":
    _demo()
    print("ok")
