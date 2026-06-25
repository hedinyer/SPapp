# Base de datos Railway (viaduct) — Estructuras e informe de pago de tarifa

> Generado con `explore_db_viaduct.py` sobre la base `railway` (PostgreSQL, backend Django).
> Esquema: `public` · **41 objetos** (tablas base).
>
> Esta base es el **backend Django** del sistema (apps `arrendamientos`, `terminal_pagos`, `clientes`, `creditos`, `reportes`, `taller`, `almacen`, `vehiculos`, `empleados`). Es **distinta** de la base Supabase que usa la app web `spappweb`.

---

## 1. Informe: ¿Qué tablas se usan para registrar el pago de una tarifa de un cliente?

### Resumen ejecutivo

El pago de tarifa (alquiler/cuota diaria de un cliente sobre su contrato) se modela como una **factura con un ítem de tipo `tarifa`** y uno o varios **pagos** aplicados a esa factura. El dato confirma que es el caso de uso dominante del sistema:

- `terminal_pagos_itemfactura.tipo_item = 'tarifa'` → **71.606** registros (vs. `abono_credito` 1.149, `multa` 74, `pago_inicial` 17).
- `terminal_pagos_factura.estado_pago = 'pagada'` → **72.590** facturas.

### Tablas centrales del flujo

| # | Tabla | Rol en el pago de tarifa |
|---|-------|--------------------------|
| 1 | `arrendamientos_contrato` | Contrato del cliente. Define `tarifa`, `frecuencia_pago`, `cliente_id`, `vehiculo_id`. Es el ancla de todo el cobro. |
| 2 | `arrendamientos_contratoalquilertarifa` | Tarifa de alquiler **por día de la semana** (lunes…domingo) con vigencia. Determina el monto esperado de cada tarifa. |
| 3 | `terminal_pagos_factura` | **Cabecera de la factura** emitida contra el contrato (`contrato_id`). Lleva `total`, `total_pagado`, `estado`, `estado_pago`. |
| 4 | `terminal_pagos_itemfactura` | **Línea de la factura**. El cobro de tarifa es la línea con `tipo_item = 'tarifa'` (`subtotal`, `cantidad`, `valor_unitario`). |
| 5 | `terminal_pagos_pagofactura` | **Registro del pago** propiamente dicho: `valor`, `fecha_pago`, `referencia`, `validado`, vinculado a `factura_id`. Aquí queda asentado el pago. |

### Tablas de apoyo (medio / canal / cuenta del pago)

| Tabla | Rol |
|-------|-----|
| `terminal_pagos_mediopago` | Medio de pago (efectivo, transferencia, etc.). |
| `terminal_pagos_canalpago` | Canal asociado a un medio (`medio_id`); `pagofactura.canal_id` apunta aquí. |
| `terminal_pagos_configuracionpago` | Configuración medio↔cuenta destino; `pagofactura.configuracion_id` apunta aquí. |
| `terminal_pagos_cuenta` | Cuenta destino del dinero. |
| `terminal_pagos_prepago` | Saldo a favor del cliente aplicado a facturas (`factura_origen_id`, `factura_aplicacion_id`). |
| `reportes_cierrecaja` / `reportes_cierrecajadetalle` | Cierre/arqueo de caja agrupando lo recaudado por medio de pago. |

### Diagrama de relaciones (claves foráneas reales)

```
clientes_cliente ──< arrendamientos_contrato >── vehiculos_vehiculo
                              │
                              ├──< arrendamientos_contratoalquilertarifa   (tarifa por día)
                              │
                              └──< terminal_pagos_factura                  (contrato_id)
                                        │
                                        ├──< terminal_pagos_itemfactura    (tipo_item = 'tarifa')
                                        │
                                        └──< terminal_pagos_pagofactura    (valor, fecha_pago, validado)
                                                  ├── canal_id        -> terminal_pagos_canalpago      -> terminal_pagos_mediopago
                                                  └── configuracion_id -> terminal_pagos_configuracionpago -> terminal_pagos_cuenta
```

### Flujo paso a paso

1. **Contrato** (`arrendamientos_contrato`): el cliente tiene un contrato con `tarifa` y `frecuencia_pago` (ej. `Diario_7`). La tarifa específica por día sale de `arrendamientos_contratoalquilertarifa`.
2. **Emisión de factura** (`terminal_pagos_factura`): se crea una factura ligada al contrato con su `total` y `estado_pago = 'pendiente'`.
3. **Ítem de tarifa** (`terminal_pagos_itemfactura`): se agrega la línea con `tipo_item = 'tarifa'` y su `subtotal`.
4. **Registro del pago** (`terminal_pagos_pagofactura`): se inserta el pago con `valor`, `fecha_pago`, `referencia`, `canal_id`, `configuracion_id` y `validado`. Esto incrementa `factura.total_pagado` y, al cubrirse el total, `estado_pago` pasa a `'pagada'`.
5. **(Opcional) Prepago** (`terminal_pagos_prepago`): si el cliente pagó de más, el excedente queda como saldo a favor y luego se aplica a otra factura.
6. **(Opcional) Cierre de caja** (`reportes_cierrecaja` + `reportes_cierrecajadetalle`): el recaudo se concilia por medio de pago.

> **Tabla clave donde queda asentado el pago:** `terminal_pagos_pagofactura`.
> **Tabla clave que identifica que el cobro es de tarifa:** `terminal_pagos_itemfactura` (`tipo_item = 'tarifa'`).

---

## 2. Estructura de todas las tablas

Leyenda: **PK** = clave primaria · **FK** = clave foránea (según restricciones reales de la BD).

### `arrendamientos_contrato`
Contrato de arriendo/opción de compra. Ancla del cobro de tarifa.

| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| fecha_inicio | date | NO | |
| cuota_inicial | numeric | NO | |
| tarifa | numeric | NO | |
| dias_contrato | integer | NO | |
| tipo_contrato | varchar(20) | NO | |
| estado | varchar(20) | NO | |
| cliente_id | bigint | NO | → clientes_cliente.id |
| vehiculo_id | bigint | NO | → vehiculos_vehiculo.id |
| motivo | varchar(20) | YES | |
| frecuencia_pago | varchar(20) | NO | |
| cuota_inicial_pagada | numeric | NO | |
| vendedor_id | bigint | YES | → clientes_vendedor.id |
| fecha_cancelacion | timestamptz | YES | |

### `arrendamientos_contratoalquilertarifa`
Tarifa de alquiler por día de la semana, con vigencia.

| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| fecha_inicio_vigencia | date | NO | |
| fecha_fin_vigencia | date | YES | |
| lunes | numeric | NO | |
| martes | numeric | NO | |
| miercoles | numeric | NO | |
| jueves | numeric | NO | |
| viernes | numeric | NO | |
| sabado | numeric | NO | |
| domingo | numeric | NO | |
| creado_en | timestamptz | NO | |
| contrato_id | bigint | NO | → arrendamientos_contrato.id |

### `arrendamientos_freezeday`
Días congelados (sin cobro) de un contrato.

| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| fecha | date | NO | |
| observaciones | text | NO | |
| creado_en | timestamptz | NO | |
| contrato_id | bigint | NO | → arrendamientos_contrato.id |
| creado_por_id | integer | YES | → auth_user.id |

### `terminal_pagos_factura`
Cabecera de factura emitida contra un contrato.

| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| fecha | timestamptz | NO | |
| estado | varchar(20) | NO | |
| estado_pago | varchar(20) | NO | |
| total | numeric | NO | |
| total_pagado | numeric | NO | |
| contrato_id | bigint | NO | → arrendamientos_contrato.id |
| creado_por_id | integer | YES | → auth_user.id |
| anulada_por_id | integer | YES | → auth_user.id |
| fecha_anulacion | timestamptz | YES | |
| motivo_anulacion | text | NO | |

### `terminal_pagos_itemfactura`
Líneas de la factura. `tipo_item` ∈ {`tarifa`, `abono_credito`, `multa`, `pago_inicial`}.

| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| tipo_item | varchar(20) | NO | |
| descripcion | varchar(255) | NO | |
| cantidad | integer | NO | |
| valor_unitario | numeric | NO | |
| subtotal | numeric | NO | |
| factura_id | bigint | NO | → terminal_pagos_factura.id |
| producto_almacen_id | bigint | YES | → almacen_producto.id |
| servicio_taller_id | bigint | YES | → taller_servicio.id |
| credito_id | bigint | YES | → creditos_credito.id |

### `terminal_pagos_pagofactura`
Registro del pago aplicado a una factura. **Aquí queda asentado el pago de tarifa.**

| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| valor | numeric | NO | |
| referencia | varchar(100) | YES | |
| canal_id | bigint | NO | → terminal_pagos_canalpago.id |
| configuracion_id | bigint | NO | → terminal_pagos_configuracionpago.id |
| factura_id | bigint | NO | → terminal_pagos_factura.id |
| fecha_pago | date | NO | |
| validado | boolean | NO | |
| es_compensacion | boolean | NO | |
| referencia_original | varchar(100) | YES | |

### `terminal_pagos_mediopago`
| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| nombre | varchar(50) | NO | |
| activo | boolean | NO | |

### `terminal_pagos_canalpago`
| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| nombre | varchar(50) | NO | |
| requiere_referencia | boolean | NO | |
| activo | boolean | NO | |
| medio_id | bigint | NO | → terminal_pagos_mediopago.id |

### `terminal_pagos_configuracionpago`
| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| activo | boolean | NO | |
| cuenta_destino_id | bigint | NO | → terminal_pagos_cuenta.id |
| medio_id | bigint | NO | → terminal_pagos_mediopago.id |

### `terminal_pagos_cuenta`
| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| nombre | varchar(50) | NO | |
| activa | boolean | NO | |

### `terminal_pagos_prepago`
Saldo a favor del cliente y su aplicación a facturas.

| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| fecha | timestamptz | NO | |
| valor | numeric | NO | |
| saldo_disponible | numeric | NO | |
| estado | varchar(20) | NO | |
| cliente_id | bigint | NO | → clientes_cliente.id |
| contrato_id | bigint | YES | → arrendamientos_contrato.id |
| factura_aplicacion_id | bigint | YES | → terminal_pagos_factura.id |
| factura_origen_id | bigint | NO | → terminal_pagos_factura.id |
| usuario_id | integer | YES | → auth_user.id |

### `terminal_pagos_multa`
| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| valor | numeric | NO | |
| fecha | date | NO | |
| observacion | text | NO | |
| estado | varchar(20) | NO | |
| created_at | timestamptz | NO | |
| cobrador_id | bigint | YES | → empleados_empleado.id |
| contrato_id | bigint | NO | → arrendamientos_contrato.id |
| saldo | numeric | NO | |

### `terminal_pagos_pagomulta`
| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| valor | numeric | NO | |
| fecha | timestamptz | NO | |
| observacion | text | NO | |
| factura_id | bigint | NO | → terminal_pagos_factura.id |
| multa_id | bigint | NO | → terminal_pagos_multa.id |

### `terminal_pagos_gestioncobro`
| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| fecha | date | NO | |
| lote | varchar(10) | NO | |
| estado | varchar(20) | NO | |
| observacion | text | NO | |
| actualizado | timestamptz | NO | |
| contrato_id | bigint | NO | → arrendamientos_contrato.id |

### `terminal_pagos_gasto`
| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| fecha | date | NO | |
| descripcion | text | NO | |
| valor | numeric | NO | |
| fecha_creacion | timestamptz | NO | |
| creado_por_id | integer | YES | → auth_user.id |
| tipo_id | bigint | NO | → terminal_pagos_tipogasto.id |
| anulado | boolean | NO | |
| medio_pago | varchar(20) | NO | |
| es_compraventa | boolean | NO | |
| vehiculo_id | bigint | YES | → vehiculos_vehiculo.id |
| anulado_por_id | integer | YES | → auth_user.id |
| fecha_anulacion | timestamptz | YES | |
| motivo_anulacion | text | NO | |

### `terminal_pagos_tipogasto`
| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| descripcion | varchar(100) | NO | |
| movimiento_interno | boolean | NO | |
| activo | boolean | NO | |
| categoria | varchar(20) | NO | |

### `creditos_credito`
| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| descripcion | text | NO | |
| monto_total | numeric | NO | |
| saldo | numeric | NO | |
| fecha | date | NO | |
| estado | varchar(20) | NO | |
| contrato_id | bigint | NO | → arrendamientos_contrato.id |

### `creditos_creditoitem`
| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| descripcion | varchar(255) | NO | |
| cantidad | integer | YES | |
| valor_unitario | numeric | YES | |
| subtotal | numeric | NO | |
| credito_id | bigint | NO | → creditos_credito.id |
| tipo | varchar(20) | NO | |

### `reportes_cierrecaja`
| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| fecha_inicio | timestamptz | NO | |
| fecha_fin | timestamptz | NO | |
| total_sistema | numeric | NO | |
| total_arqueo | numeric | NO | |
| diferencia | numeric | NO | |
| autorizado | boolean | NO | |
| observacion | text | NO | |
| creado_en | timestamptz | NO | |
| operador_id | integer | NO | → auth_user.id |

### `reportes_cierrecajadetalle`
| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| medio_id | bigint | NO | → terminal_pagos_mediopago.id |
| total_sistema | numeric | NO | |
| total_arqueo | numeric | NO | |
| diferencia | numeric | NO | |
| cierre_id | bigint | NO | → reportes_cierrecaja.id |

### `clientes_cliente`
| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| cedula | varchar(20) | NO | |
| nombre | varchar(100) | NO | |
| nacionalidad | varchar(50) | YES | |
| direccion | varchar(200) | YES | |
| telefono | varchar(20) | YES | |
| referencia_1 | varchar(100) | YES | |
| telefono_ref_1 | varchar(20) | YES | |
| referencia_2 | varchar(100) | YES | |
| telefono_ref_2 | varchar(20) | YES | |
| tipo | varchar(20) | NO | |
| status | varchar(20) | YES | |
| costo_administrativo | numeric | YES | |
| costo_operativo | numeric | YES | |
| tipo_documento | varchar(10) | NO | |
| foto_cliente | varchar(100) | YES | |

### `clientes_vendedor`
| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| cedula | varchar(20) | NO | |
| nombre | varchar(150) | NO | |
| telefono | varchar(20) | YES | |
| direccion | varchar(255) | YES | |
| cargo | varchar(100) | NO | |
| creado | timestamptz | NO | |
| actualizado | timestamptz | NO | |

### `vehiculos_vehiculo`
| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| placa | varchar(20) | NO | |
| marca | varchar(50) | NO | |
| modelo | varchar(50) | NO | |
| serie | varchar(50) | YES | |
| propietario | varchar(100) | NO | |
| numero_motor | varchar(50) | YES | |
| numero_chasis | varchar(50) | YES | |
| actualizacion_soat | date | YES | |
| estado | varchar(10) | NO | |
| linea_gps | varchar(50) | YES | |
| estado_obs | varchar(30) | YES | |
| color | varchar(50) | YES | |
| tecnomecanica | date | YES | |
| razon_social | varchar(100) | YES | |
| gps_recarga_vencimiento | date | YES | |
| operador_gps | varchar(20) | YES | |
| tarjeta_propiedad | varchar(100) | YES | |

### `vehiculos_marca`
| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| nombre | varchar(100) | NO | |
| parent_id | bigint | YES | (auto-referencia marca/línea) |

### `vehiculos_color`
| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| nombre | varchar(50) | NO | |

### `almacen_producto`
| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| nombre | varchar(100) | NO | |
| referencia | varchar(100) | NO | |
| utilidad | varchar(100) | YES | |
| precio_venta | numeric | NO | |
| ean | varchar(13) | YES | |

### `almacen_movimiento`
| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| tipo | varchar(30) | NO | |
| cantidad | integer | NO | |
| fecha | date | NO | |
| precio_unitario | numeric | NO | |
| factura_referencia | varchar(100) | YES | |
| producto_id | bigint | NO | → almacen_producto.id |
| proveedor_id | bigint | YES | → almacen_proveedor.id |
| fecha_factura | date | YES | |

### `almacen_proveedor`
| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| nombre | varchar(100) | NO | |
| nit | varchar(50) | NO | |
| telefono | varchar(20) | NO | |

### `taller_servicio`
| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| nombre_servicio | varchar(100) | NO | |
| valor | numeric | NO | |

### `taller_mecanico`
| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| nombre | varchar(100) | NO | |
| identificacion | varchar(50) | NO | |

### `empleados_empleado`
| Columna | Tipo | Null | FK |
|---|---|---|---|
| id | bigint | NO | **PK** |
| nombre | varchar(120) | NO | |
| documento | varchar(50) | NO | |
| cargo | varchar(50) | NO | |
| activo | boolean | NO | |
| created_at | timestamptz | NO | |
| user_id | integer | YES | → auth_user.id |

---

### Tablas de infraestructura Django/Auth (no relacionadas con el cobro)

`auth_user`, `auth_group`, `auth_permission`, `auth_group_permissions`, `auth_user_groups`, `auth_user_user_permissions`, `django_admin_log`, `django_content_type`, `django_migrations`, `django_session`.

Estructura resumida:

- **`auth_user`**: id (PK), password, last_login, is_superuser, username, first_name, last_name, email, is_staff, is_active, date_joined.
- **`auth_group`**: id (PK), name.
- **`auth_permission`**: id (PK), name, content_type_id → django_content_type.id, codename.
- **`auth_group_permissions`**: id (PK), group_id, permission_id.
- **`auth_user_groups`**: id (PK), user_id, group_id.
- **`auth_user_user_permissions`**: id (PK), user_id, permission_id.
- **`django_admin_log`**: id (PK), action_time, object_id, object_repr, action_flag, change_message, content_type_id, user_id.
- **`django_content_type`**: id (PK), app_label, model.
- **`django_migrations`**: id (PK), app, name, applied.
- **`django_session`**: session_key (PK), session_data, expire_date.
