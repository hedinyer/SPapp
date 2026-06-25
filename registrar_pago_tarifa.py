# registrar_pago_tarifa.py
# Registra un pago de tarifa por TRANSFERENCIA NEQUI a partir de la placa.
#
# Flujo:
#   1. Placa  -> contrato ACTIVO (estado='Activo')
#   2. Contrato -> facturas de tarifa pendientes (estado='confirmada', estado_pago='pendiente'),
#      ordenadas de la MAS ANTIGUA a la mas reciente.
#   3. El usuario elige el DESTINATARIO (cuenta Nequi que recibio la plata)
#   4. El monto se reparte FIFO: llena la factura mas antigua hasta su saldo y
#      el excedente pasa a la(s) siguiente(s). Por cada factura tocada se inserta
#      un registro en terminal_pagos_pagofactura y se actualiza la factura.
#      Acepta pagos PARCIALES.
#   5. Si aun queda dinero tras cubrir TODAS las facturas pendientes, el sobrante
#      se registra como PREPAGO (saldo a favor del cliente) en terminal_pagos_prepago.
#
# Origen del pago: SIEMPRE Nequi (medio 'Transfer Nequi').

import sys
from datetime import datetime
from decimal import Decimal, InvalidOperation

from explore_db_viaduct import get_connection

MEDIO_NEQUI = "Transfer Nequi"
# La tabla terminal_pagos_prepago esta vacia (sin datos de referencia); el modelo
# Django no esta en este repo. Se asume 'disponible' como estado de saldo a favor.
ESTADO_PREPAGO = "disponible"


def _utf8_stdout():
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass


def parse_fecha(texto):
    """Acepta 2026-06-13, 13/06/2026, 13-06-2026."""
    texto = texto.strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(texto, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Fecha no reconocida: '{texto}'. Usa 2026-06-13 o 13/06/2026.")


def parse_monto(texto):
    """Acepta '8000', '8.000', '$ 8.000', '8000.00'."""
    limpio = texto.replace("$", "").replace(" ", "").strip()
    if limpio.count(".") > 0 and limpio.count(",") == 0:
        # '8.000' (separador de miles) -> quitar puntos si no parecen decimales
        partes = limpio.split(".")
        if all(len(p) == 3 for p in partes[1:]):
            limpio = "".join(partes)
    limpio = limpio.replace(",", ".")
    try:
        valor = Decimal(limpio)
    except InvalidOperation:
        raise ValueError(f"Monto invalido: '{texto}'")
    if valor <= 0:
        raise ValueError("El monto debe ser mayor que cero.")
    return valor


def resolver_canal_nequi(cur):
    cur.execute(
        """
        SELECT cp.id
        FROM terminal_pagos_canalpago cp
        JOIN terminal_pagos_mediopago m ON m.id = cp.medio_id
        WHERE m.nombre = %s AND cp.activo = true
        ORDER BY cp.id
        LIMIT 1;
        """,
        (MEDIO_NEQUI,),
    )
    row = cur.fetchone()
    if not row:
        raise RuntimeError(f"No hay canal activo para el medio '{MEDIO_NEQUI}'.")
    return row[0]


def listar_destinatarios(cur):
    cur.execute(
        """
        SELECT cfg.id, ct.nombre
        FROM terminal_pagos_configuracionpago cfg
        JOIN terminal_pagos_mediopago m ON m.id = cfg.medio_id
        JOIN terminal_pagos_cuenta ct ON ct.id = cfg.cuenta_destino_id
        WHERE m.nombre = %s AND cfg.activo = true
        ORDER BY cfg.id;
        """,
        (MEDIO_NEQUI,),
    )
    return cur.fetchall()  # [(configuracion_id, cuenta_nombre), ...]


def buscar_contrato_activo(cur, placa):
    cur.execute(
        """
        SELECT c.id, cl.id, cl.nombre, cl.cedula, c.tarifa, c.frecuencia_pago
        FROM arrendamientos_contrato c
        JOIN vehiculos_vehiculo v ON v.id = c.vehiculo_id
        JOIN clientes_cliente cl ON cl.id = c.cliente_id
        WHERE upper(v.placa) = upper(%s) AND c.estado = 'Activo'
        ORDER BY c.id DESC;
        """,
        (placa,),
    )
    return cur.fetchall()


def buscar_facturas_tarifa_pendientes(cur, contrato_id):
    """Facturas de tarifa pendientes, de la mas antigua a la mas reciente (FIFO)."""
    cur.execute(
        """
        SELECT f.id, f.fecha::date, f.total, f.total_pagado, (f.total - f.total_pagado) AS saldo
        FROM terminal_pagos_factura f
        WHERE f.contrato_id = %s
          AND f.estado = 'confirmada'
          AND f.estado_pago = 'pendiente'
          AND (f.total - f.total_pagado) > 0
          AND EXISTS (
              SELECT 1 FROM terminal_pagos_itemfactura i
              WHERE i.factura_id = f.id AND i.tipo_item = 'tarifa'
          )
        ORDER BY f.fecha ASC, f.id ASC;
        """,
        (contrato_id,),
    )
    return cur.fetchall()


def planificar_reparto(facturas, valor):
    """Reparte 'valor' FIFO sobre las facturas. Devuelve (plan, sobrante).

    plan = [(factura_id, fecha, saldo_antes, aplicar), ...]
    sobrante = monto que no se pudo aplicar (no quedan facturas pendientes).
    """
    restante = valor
    plan = []
    for fid, fecha, total, pagado, saldo in facturas:
        if restante <= 0:
            break
        aplicar = min(restante, saldo)
        plan.append((fid, fecha, saldo, aplicar))
        restante -= aplicar
    return plan, restante


def aplicar_pago_a_factura(cur, factura_id, valor, referencia, fecha_pago, canal_id, configuracion_id):
    """Inserta un pago y actualiza la factura. Devuelve (pago_id, nuevo_total_pagado, nuevo_estado)."""
    cur.execute(
        "SELECT total, total_pagado FROM terminal_pagos_factura WHERE id = %s FOR UPDATE;",
        (factura_id,),
    )
    total, total_pagado = cur.fetchone()

    cur.execute(
        """
        INSERT INTO terminal_pagos_pagofactura
            (valor, referencia, canal_id, configuracion_id, factura_id,
             fecha_pago, validado, es_compensacion, referencia_original)
        VALUES (%s, %s, %s, %s, %s, %s, false, false, NULL)
        RETURNING id;
        """,
        (valor, referencia, canal_id, configuracion_id, factura_id, fecha_pago),
    )
    pago_id = cur.fetchone()[0]

    nuevo_total_pagado = total_pagado + valor
    nuevo_estado = "pagada" if nuevo_total_pagado >= total else "pendiente"

    cur.execute(
        "UPDATE terminal_pagos_factura SET total_pagado = %s, estado_pago = %s WHERE id = %s;",
        (nuevo_total_pagado, nuevo_estado, factura_id),
    )
    return pago_id, nuevo_total_pagado, nuevo_estado


def crear_prepago(cur, cliente_id, contrato_id, factura_origen_id, valor, fecha):
    """Registra un saldo a favor del cliente. factura_origen_id es NOT NULL:
    se usa la ultima factura cubierta (la que genero el excedente)."""
    cur.execute(
        """
        INSERT INTO terminal_pagos_prepago
            (fecha, valor, saldo_disponible, estado, cliente_id, contrato_id,
             factura_origen_id, factura_aplicacion_id, usuario_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s, NULL, NULL)
        RETURNING id;
        """,
        (fecha, valor, valor, ESTADO_PREPAGO, cliente_id, contrato_id, factura_origen_id),
    )
    return cur.fetchone()[0]


def pedir(texto):
    return input(texto).strip()


def main():
    _utf8_stdout()
    print("=" * 60)
    print("  Registrar pago de TARIFA por Nequi")
    print("=" * 60)

    conn = get_connection()
    conn.autocommit = False
    cur = conn.cursor()

    try:
        canal_id = resolver_canal_nequi(cur)

        # --- 1. Placa -> contrato activo ---
        placa = pedir("\nPlaca: ")
        contratos = buscar_contrato_activo(cur, placa)
        if not contratos:
            print(f"X No hay contrato ACTIVO para la placa '{placa}'.")
            return 1
        if len(contratos) > 1:
            print(f"\nHay {len(contratos)} contratos activos para esta placa:")
            for i, (cid, _clid, nombre, cedula, tarifa, frec) in enumerate(contratos, 1):
                print(f"  {i}. Contrato {cid} | {nombre} ({cedula}) | tarifa {tarifa} | {frec}")
            sel = pedir("Elige numero de contrato: ")
            if not sel.isdigit() or not (1 <= int(sel) <= len(contratos)):
                print("X Seleccion invalida.")
                return 1
            contrato = contratos[int(sel) - 1]
        else:
            contrato = contratos[0]

        contrato_id, cliente_id, nombre, cedula, tarifa, frec = contrato
        print(f"\nContrato {contrato_id} | {nombre} ({cedula}) | tarifa {tarifa} | {frec}")

        # --- 2. Facturas de tarifa pendientes (FIFO) ---
        facturas = buscar_facturas_tarifa_pendientes(cur, contrato_id)
        if not facturas:
            print("X No hay facturas de tarifa pendientes para este contrato.")
            return 1
        saldo_total = sum(f[4] for f in facturas)
        print(f"\nFacturas de tarifa pendientes ({len(facturas)}) | saldo total {saldo_total}:")
        for fid, fecha, total, pagado, saldo in facturas:
            print(f"  #{fid} | fecha {fecha} | total {total} | pagado {pagado} | saldo {saldo}")

        # --- 3. Destinatario (cuenta Nequi receptora) ---
        destinatarios = listar_destinatarios(cur)
        print("\n¿Para quien? (cuenta Nequi que recibio la plata)")
        for i, (cfg_id, cuenta) in enumerate(destinatarios, 1):
            print(f"  {i}. {cuenta}")
        sel = pedir("Elige destinatario: ")
        if not sel.isdigit() or not (1 <= int(sel) <= len(destinatarios)):
            print("X Seleccion invalida.")
            return 1
        configuracion_id, cuenta_nombre = destinatarios[int(sel) - 1]

        # --- 4. Datos del comprobante ---
        valor = parse_monto(pedir("\nMonto del comprobante: "))
        referencia = pedir("Referencia: ")
        fecha_pago = parse_fecha(pedir("Fecha (2026-06-13 o 13/06/2026): "))

        # --- Reparto FIFO ---
        plan, sobrante = planificar_reparto(facturas, valor)
        if not plan:
            print("X No se pudo aplicar el pago (sin facturas pendientes).")
            return 1

        print("\n" + "-" * 60)
        print("RESUMEN DEL PAGO")
        print("-" * 60)
        print(f"  Cliente      : {nombre} ({cedula})")
        print(f"  Placa        : {placa.upper()}  |  Contrato {contrato_id}")
        print(f"  Origen       : {MEDIO_NEQUI} (canal {canal_id})")
        print(f"  Destinatario : {cuenta_nombre} (config {configuracion_id})")
        print(f"  Monto        : {valor}")
        print(f"  Referencia   : {referencia}")
        print(f"  Fecha pago   : {fecha_pago}")
        print("  Reparto FIFO:")
        for fid, fecha, saldo, aplicar in plan:
            queda = saldo - aplicar
            etiqueta = "paga completa" if queda == 0 else f"parcial (queda {queda})"
            print(f"    factura #{fid} ({fecha}): aplica {aplicar} -> {etiqueta}")
        if sobrante > 0:
            print(
                f"  ! Sobrante {sobrante} -> se registrara como PREPAGO "
                f"(saldo a favor, estado '{ESTADO_PREPAGO}')."
            )
        print("-" * 60)

        if pedir("¿Confirmar y guardar? (s/n): ").lower() != "s":
            conn.rollback()
            print("Cancelado. No se guardo nada.")
            return 0

        print("\nOK Pago(s) registrado(s):")
        for fid, fecha, saldo, aplicar in plan:
            pago_id, nuevo_pagado, nuevo_estado = aplicar_pago_a_factura(
                cur, fid, aplicar, referencia, fecha_pago, canal_id, configuracion_id
            )
            print(
                f"  pago_id={pago_id} | factura {fid}: +{aplicar} "
                f"-> total_pagado={nuevo_pagado}, estado_pago={nuevo_estado}"
            )

        if sobrante > 0:
            factura_origen_id = plan[-1][0]  # ultima factura cubierta (genero el excedente)
            prepago_id = crear_prepago(
                cur, cliente_id, contrato_id, factura_origen_id, sobrante, fecha_pago
            )
            print(
                f"  prepago_id={prepago_id} | saldo a favor {sobrante} "
                f"(origen factura {factura_origen_id}, estado '{ESTADO_PREPAGO}')"
            )

        conn.commit()
        print("  (validado=false -> queda pendiente de verificacion)")
        return 0

    except Exception as e:
        conn.rollback()
        print(f"\nX Error (se hizo rollback, no se guardo nada): {e}")
        return 1
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
