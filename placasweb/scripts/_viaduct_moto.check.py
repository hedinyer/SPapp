"""Check: un día no cuenta más de 1 cuota; el saldo sí suma fracción."""
from decimal import Decimal, ROUND_HALF_UP

from _viaduct_moto import _Q02, cuotas_de_dias


def q(n: Decimal) -> Decimal:
    return n.quantize(_Q02, rounding=ROUND_HALF_UP)


# DUR51I: 48 días llenos + día de $34.000 → 48,50 (prepago no suma si hay parcial)
assert q(cuotas_de_dias(
    Decimal(38000),
    {i: Decimal(38000) for i in range(48)} | {99: Decimal(34000)},
    Decimal(11000),
)) == Decimal("48.50")

# DTW25I: 91 diarias + $8.000 prepago
assert q(cuotas_de_dias(
    Decimal(38000),
    {i: Decimal(38000) for i in range(91)},
    Decimal(8000),
)) == Decimal("91.21")

# Tres facturas el mismo día siguen siendo 1
assert q(cuotas_de_dias(Decimal(38000), {1: Decimal(114000)})) == Decimal("1.00")

print("_viaduct_moto.check.py OK")
