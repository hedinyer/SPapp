# Plugin Hermes — SP Gerente (Supabase dual)

Lectura directa a **ambos** proyectos Supabase para la gerente: inventarios,
ventas de tienda, caja, cartera/mora, clientes y garaje.

| Sede | Empresa | Supabase |
| --- | --- | --- |
| `garrido` | Soluciones Garrido (Girardot) | `iilgrapnrkwdcouielwz` |
| `pinilla` | Soluciones Pinilla (Bogotá) | `ziihqvtjacqzwmcmpiyp` |

**Solo lectura.** No aprueba créditos ni registra pagos.

## Instalar

```bash
cp -r integrations/hermes/sp-gerente ~/.hermes/plugins/sp-gerente
hermes plugins enable sp-gerente
```

Opcional — override de credenciales:

```bash
export SP_GARRIDO_SUPABASE_URL="https://iilgrapnrkwdcouielwz.supabase.co"
export SP_GARRIDO_SUPABASE_ANON_KEY="..."
export SP_PINILLA_SUPABASE_URL="https://ziihqvtjacqzwmcmpiyp.supabase.co"
export SP_PINILLA_SUPABASE_ANON_KEY="..."
```

Por defecto usa las anon keys ya embebidas en cada `spappweb` (mismas que el panel).

## Tools

| Tool | Uso |
| --- | --- |
| `sp_sedes` | Lista PDVs |
| `sp_informe_diario` | Caja + ventas + alertas stock + top mora |
| `sp_inventario` | Stock / bajo mínimo |
| `sp_ventas` | Productos + motos contado del día |
| `sp_caja` | Sesión de caja + egresos |
| `sp_cartera_mora` | Vista `atrasos` |
| `sp_buscar_cliente` | Cédula / nombre |
| `sp_cliente` | Ficha 360° (`sede` + `user_id`) |
| `sp_garaje` | Motos físicas por estado |

Parámetro común: `sede = garrido | pinilla | ambas` (default `ambas`).
Fechas: `YYYY-MM-DD` en `America/Bogota`.

## Prompts útiles (gerente)

- «Dame el informe diario de ambas sedes.»
- «¿Qué hay bajo mínimo en Pinilla?»
- «Ventas de tienda de hoy en Garrido.»
- «Top mora de ambas, solo ≥4 días.»
- «Busca el cliente 1097… en Pinilla y dame la ficha.»

## Self-check

```bash
python ~/.hermes/plugins/sp-gerente/__init__.py
# o desde el repo:
python integrations/hermes/sp-gerente/__init__.py
```

## Relación con el plugin `spappweb`

| Plugin | Canal | Para quién |
| --- | --- | --- |
| **sp-gerente** | Supabase REST (dual) | Gerente / reportes PDV |
| **spappweb** | `/api/agent/tools` (una URL) | Operación admin (mutaciones) |

Para mutar (aprobar crédito, confirmar pago) usa `spappweb` apuntando a la sede.
Para preguntar «cómo vamos hoy en los puntos de venta» usa **sp-gerente**.
