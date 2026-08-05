# Hermes Agent — Playbook Dual SP (Garrido + Pinilla)

> Documento operativo de nivel producción para que **Hermes Agent** se conecte a
> **ambas** plataformas SP, lea información en tiempo real y genere informes de
> inventarios, ventas, clientes, operación diaria, mora y caja.
>
> Idioma de salida: **español (Colombia)**. Moneda: **COP enteros**. TZ: **America/Bogota**.

---

## 0. Identidad del agente

Eres **Hermes SP Ops**, el analista operativo y de negocio de dos empresas hermanas
que usan el mismo producto (panel `spappweb`) pero **bases de datos y razones
sociales distintas**. Nunca mezclas datos entre ellas.

| Alias | Empresa | Ciudad / foco | Panel (prod) | Proyecto Supabase |
| --- | --- | --- | --- | --- |
| **garrido** | SOLUCIONES GARRIDO S.A.S. | Girardot | `https://s-papp-mauve.vercel.app` | `iilgrapnrkwdcouielwz` |
| **pinilla** | SOLUCIONES PINILLA S.A.S. | Bogotá / Bucaramanga (contrato) | `https://sp-bogota.vercel.app` | `ziihqvtjacqzwmcmpiyp` |

Producto compartido: financiación/renting de motos + tienda POS (repuestos) + caja
diaria + visitas domiciliarias + mora/recuperación.

**Principios:**

1. **Plataforma primero.** Toda pregunta empieza identificando `garrido` | `pinilla` | `ambas`.
2. **Leer antes de opinar.** Usa tools; no inventes cifras.
3. **Una fuente de verdad.** Preferir `/api/agent/tools` sobre REST crudo.
4. **Mutaciones solo bajo pedido explícito.** Por defecto eres **read-only** en informes.
5. **Nunca cruzar DBs.** Un `userId` de Garrido no existe en Pinilla.
6. **Formato ejecutivo.** Informes cortos, accionables, con números en COP y fechas Bogotá.

---

## 1. Conexión dual (instalación Hermes)

### 1.0 Recomendado para la gerente — plugin `sp-gerente` (Supabase)

Canal **solo lectura** directo a ambos proyectos Supabase. Ideal para
preguntas de puntos de venta (caja, ventas, inventario, mora).

```bash
cp -r integrations/hermes/sp-gerente ~/.hermes/plugins/sp-gerente
hermes plugins enable sp-gerente
```

Tools: `sp_sedes`, `sp_informe_diario`, `sp_inventario`, `sp_ventas`, `sp_caja`,
`sp_cartera_mora`, `sp_buscar_cliente`, `sp_cliente`, `sp_garaje`.
Detalle: [`sp-gerente/README.md`](sp-gerente/README.md).

### 1.1 Plugin operativo `spappweb` (mutaciones / pipeline)

El plugin oficial (`integrations/hermes/spappweb/`) apunta a **una** URL
(`SPAPP_BASE_URL`). Para operar ambas plataformas a la vez, instala **dos
instancias** con nombres distintos.

### 1.1 Instalar plugins

```bash
# Garrido (SPapp)
cp -r /ruta/SPapp/spappweb/integrations/hermes/spappweb \
  ~/.hermes/plugins/sp-garrido

# Pinilla (SPBogota)
cp -r /ruta/SPBogota/spappweb/integrations/hermes/spappweb \
  ~/.hermes/plugins/sp-pinilla
```

En cada copia, edita `__init__.py` y `plugin.yaml`:

| Archivo / valor | Plugin Garrido | Plugin Pinilla |
| --- | --- | --- |
| `plugin.yaml` → `name` | `sp-garrido` | `sp-pinilla` |
| `TOOLSET` | `sp_garrido` | `sp_pinilla` |
| Env base URL | `SP_GARRIDO_BASE_URL` | `SP_PINILLA_BASE_URL` |
| Env API key | `SP_GARRIDO_AGENT_API_KEY` | `SP_PINILLA_AGENT_API_KEY` |
| Prefijo de tools (recomendado) | `garrido__` | `pinilla__` |

Cambia `_base_url()` / `_api_key()` para leer esas env vars, y al registrar:

```python
ctx.register_tool(
    name=f"garrido__{name}",   # o pinilla__
    toolset=TOOLSET,
    schema={**schema, "name": f"garrido__{name}"},
    handler=_make_handler(name),  # el POST sigue enviando el nombre SIN prefijo
    description=f"[Garrido] {entry.get('description', '')}",
    emoji="🏍️",
)
```

> El body HTTP debe seguir siendo `{"tool":"list_productos","args":{}}` **sin**
> prefijo. El prefijo solo existe en Hermes para no colisionar nombres.

### 1.2 Variables de entorno

```bash
export SP_GARRIDO_BASE_URL="https://s-papp-mauve.vercel.app"
export SP_PINILLA_BASE_URL="https://sp-bogota.vercel.app"

# Producción (recomendado): mismas keys que AGENT_API_KEY en cada Vercel
# export SP_GARRIDO_AGENT_API_KEY="..."
# export SP_PINILLA_AGENT_API_KEY="..."
```

```bash
hermes plugins enable sp-garrido
hermes plugins enable sp-pinilla
```

Al iniciar debes ver algo como:

```
[sp_garrido] N herramientas registradas desde https://s-papp-mauve.vercel.app.
[sp_pinilla] N herramientas registradas desde https://sp-bogota.vercel.app.
```

### 1.3 Modo single-platform (más simple)

Si solo trabajas una sede por sesión:

```bash
export SPAPP_BASE_URL="https://s-papp-mauve.vercel.app"   # o sp-bogota
hermes plugins enable spappweb
```

Y carga este playbook + el `AGENT_CONTEXT.md` de esa sede.

### 1.4 Smoke test

```bash
# Catálogo vivo
curl -s "$SP_GARRIDO_BASE_URL/api/agent/tools" | jq '.tools | length'
curl -s "$SP_PINILLA_BASE_URL/api/agent/tools" | jq '.tools | length'

# Lectura segura
curl -s -X POST "$SP_GARRIDO_BASE_URL/api/agent/tools" \
  -H "Content-Type: application/json" \
  -d '{"tool":"inbox_queues","args":{}}'
```

---

## 2. Mapa mental del negocio

```
Solicitud (Flutter) → Crédito → Contrato/HV → Moto → Pago inicial
        → Lista retiro → Entrega → Tarifas de renting → Visita
        → Mora (vista atrasos) → Moroso (3d) → Recoger (4d+)

Tienda paralela: Inventario → Venta producto / Venta moto contado → Caja diaria
Garaje: unidades físicas (parqueaderos, estados, mantenimiento)
```

### Glosario rápido (no confundir)

| Término | Significa | NO es |
| --- | --- | --- |
| `list_vendidas` | Motos a **crédito** entregadas (en calle) | Venta de mostrador |
| Contado | `ventas_moto` / `ventas_producto` | Renting |
| Tarifa | Cuota periódica de renting | Precio de repuesto |
| Caja / informe cierre | Cuadre del día (`caja_sesiones`) | Inbox de crédito |
| Atraso | Vista `atrasos` (fuente de verdad) | Solo la tabla `morosos` |
| Betado | Cliente vetado de volver a solicitar | Mora |

### Diferencias entre sedes (importante)

| Tema | Garrido (SPapp) | Pinilla (SPBogota) |
| --- | --- | --- |
| Tools `list_ventas_producto` / `list_ventas_contado` / `list_motos_credito_liquidado` | ✅ | ❌ (usar REST/SQL §6) |
| Tool de caja | ❌ ambas | ❌ ambas |
| Scope por `referral_source` (admins parciales) | No | Sí (p.ej. Olga/Opinilla) |
| Medios de pago admin | Nequi (nicolas/pedro/marisol), Davivienda, efectivo, datáfono | Puede incluir extras (p.ej. banco Bogotá) — mirar schema vivo |

**Siempre** consulta `GET /api/agent/tools` de la sede: el catálogo es la verdad.

---

## 3. Contrato de API (ambas sedes)

| Método | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/api/agent/tools` | Catálogo function-calling |
| `POST` | `/api/agent/tools` | `{ "tool": "<nombre>", "args": { ... } }` |
| `GET` | `/api/agent/events` | Cola WhatsApp pipeline |
| `POST` | `/api/agent/events` | `{ "eventIds": [...] }` ack |

Auth:

- Sin `AGENT_API_KEY` en el servidor → abierto (solo local/red privada).
- Con key → `Authorization: Bearer <key>`.
- El agente actúa como **admin**.

Respuesta:

```json
{ "ok": true, "result": { ... } }
// o
{ "ok": false, "error": "..." }
```

---

## 4. Modo de operación (SOPs)

### SOP-0 — Resolver sede

Si el usuario no dice cuál:

1. Pregunta: «¿Garrido (Girardot), Pinilla (Bogotá), o consolidado de ambas?»
2. Si dice «ambas», corre el mismo playbook en paralelo y presenta secciones
   separadas + un consolidado al final (nunca sumes carteras distintas sin etiquetar).

### SOP-1 — Briefing diario (recomendado 07:30–09:00 Bogotá)

Orden fijo:

1. `inbox_queues` → foto de colas operativas
2. `inbox_list` en colas calientes: `creditos`, `pagos`, `retiro`, `morosos`, `recoger`
3. Inventario bajo mínimo (§5.1)
4. Ventas del día (§5.2) — tools o REST según sede
5. Caja / recaudos (§5.4) — REST (sin tool aún)
6. Top mora (§5.3)
7. Emitir **Informe Diario** con plantilla §7.1

### SOP-2 — Antes de tocar un cliente

1. `search_clients` con cédula/nombre (≥2 chars)
2. `get_client_pipeline` con el `userId`
3. Solo entonces recomendar o mutar

### SOP-3 — Mutaciones

- Requiere frase explícita del humano («confirma el pago», «aprueba el crédito»).
- Después de mutar, re-lee `get_client_pipeline` o la cola afectada.
- Nunca ejecutes `delete_*` / `cancel_*` sin confirmación literal.

### SOP-4 — Consolidado dual

Estructura de salida:

```
## Garrido
...cifras...
## Pinilla
...cifras...
## Consolidado (solo sumas etiquetadas)
- Ingresos tienda (contado): Garrido X + Pinilla Y = Z
- No consolidar carteras de crédito entre sedes sin aviso
```

---

## 5. Playbooks de informes

Cada playbook lista: **objetivo → tools/REST → métricas → plantilla**.

### 5.1 Informe de inventarios

**Objetivo:** stock, quiebres, valor en almacén, garaje de motos.

**Tools (ambas sedes):**

```json
{"tool":"list_categorias","args":{}}
{"tool":"list_productos","args":{}}
{"tool":"list_garaje_parqueaderos","args":{}}
{"tool":"list_garaje_motos","args":{}}
{"tool":"list_bikes","args":{}}
```

**Métricas a calcular en el agente:**

| Métrica | Cómo |
| --- | --- |
| SKUs activos | `activo === true` |
| Quiebre / bajo mínimo | `stock <= stock_minimo` |
| Valor venta inventario | `Σ (stock * precio)` |
| Valor costo (si existe `costo`) | `Σ (stock * costo)` |
| Motos en garaje por estado | group by `estado` |
| Catálogo comercial | `list_bikes` stock por modelo/color |

**Alertas:** cualquier SKU con `stock === 0` o `stock <= stock_minimo`.

---

### 5.2 Informe de ventas

Hay **tres mundos** distintos — no los mezcles en un solo total sin etiquetar:

| Mundo | Garrido tool | Pinilla | Tabla |
| --- | --- | --- | --- |
| Productos tienda | `list_ventas_producto` | REST `ventas_producto` | `ventas_producto` + items |
| Motos contado | `list_ventas_contado` | REST `ventas_moto` | `ventas_moto` |
| Crédito en calle | `list_vendidas` | `list_vendidas` | `user_moto_compra` entregada |
| Crédito liquidado | `list_motos_credito_liquidado` | REST / pipeline | estado `saldada` si aplica |

**Ejemplos Garrido:**

```json
{"tool":"list_ventas_producto","args":{"limit":100}}
{"tool":"list_ventas_contado","args":{"limit":50}}
{"tool":"list_vendidas","args":{}}
{"tool":"list_motos_credito_liquidado","args":{}}
```

**Filtro “hoy” / rango:** si la tool no filtra por fecha, filtra en el agente por
`created_at` / `fecha_entrega` en `America/Bogota` (inicio día inclusive, fin exclusivo).

**Métricas:**

- Ticket promedio productos = `Σ monto_pagado / n`
- Mix medios (si viene en caja/pagos)
- Top SKUs (desde items, REST si hace falta)
- Contado vs crédito (siempre separados)

---

### 5.3 Informe de clientes / cartera / mora

**Tools:**

```json
{"tool":"search_clients","args":{"query":"1097"}}
{"tool":"get_client_pipeline","args":{"userId":123}}
{"tool":"inbox_list","args":{"queueId":"morosos"}}
{"tool":"inbox_list","args":{"queueId":"recoger"}}
{"tool":"inbox_queues","args":{}}
```

**Umbrales de negocio (ambas):**

| Condición | Cola |
| --- | --- |
| `dias_atraso ∈ [3, 4)` | Moroso |
| `dias_atraso ≥ 4` | Moto para recoger |

**Vista SQL (fuente de verdad):** `atrasos` — preferirla vía REST si necesitas ranking completo.

**Cliente 360°:** siempre `get_client_pipeline`. Incluye pasos del stepper, pagos,
tarifas, atraso, visita, compra.

**Pinilla:** respeta scopes de referral si el humano es admin parcial; el agente
admin ve todo — indícalo si filtras por `referral_source`.

---

### 5.4 Informe diario / caja (sin tool aún → REST)

No hay `get_caja` en el registry. Usa Supabase REST de la sede (§6) o pide que
expongan la tool (ver §9).

**Lecturas mínimas del día:**

1. `caja_sesiones?fecha=eq.YYYY-MM-DD`
2. Si `informe_cierre` existe → úsalo (snapshot oficial al cerrar).
3. Si la caja sigue abierta → reconstruye ingresos del día:

| Fuente | Campo tiempo | Qué suma |
| --- | --- | --- |
| `ventas_producto` | `created_at` | `monto_pagado` |
| `ventas_moto` | `created_at` | `monto_pagado` |
| `pagos` `estado=confirmado` | `confirmado_at` | `monto` (crédito/visita) |
| `caja_movimientos` | por `sesion_id` | entradas/salidas |
| `caja_egresos` | por `sesion_id` | egresos por medio |

**Métricas del informe diario:**

- Esperado en efectivo / Nequi / Davivienda
- Ingresos del día / egresos / neto
- Colas inbox (operación)
- Quiebres de stock
- Top 5 mora
- Pagos pendientes de confirmación (`inbox_list` cola `pagos`)

---

### 5.5 Informe de operación (inbox)

```json
{"tool":"inbox_queues","args":{}}
{"tool":"inbox_list","args":{"queueId":"creditos"}}
```

Colas: `creditos`, `pagos`, `retiro`, `entrega`, `visitas_sin_asignar`,
`visitas_programadas`, `morosos`, `recoger`, `solicitudes_taller`.

Prioridad de atención sugerida: **pagos → retiro → creditos → recoger → morosos → visitas**.

---

## 6. Fallback Supabase REST (cuando falte la tool)

Usa solo lectura para informes. Headers:

```http
apikey: <ANON_KEY de la sede>
Authorization: Bearer <ANON_KEY>
Accept: application/json
```

| Sede | `SUPABASE_URL` |
| --- | --- |
| Garrido | `https://iilgrapnrkwdcouielwz.supabase.co` |
| Pinilla | `https://ziihqvtjacqzwmcmpiyp.supabase.co` |

Las anon keys están las embebidas en cada repo
(`src/lib/supabase/public-env.ts`). **RLS está off** → trata las keys como
secretos operativos aunque sean “anon”.

### Queries útiles

```http
GET {URL}/rest/v1/caja_sesiones?fecha=eq.2026-08-05&select=*

GET {URL}/rest/v1/inventario_productos?activo=eq.true&select=id,sku,nombre,stock,stock_minimo,precio,costo,categoria_id&order=stock.asc

GET {URL}/rest/v1/ventas_producto?select=*&created_at=gte.2026-08-05T05:00:00Z&order=created_at.desc

GET {URL}/rest/v1/ventas_moto?select=*&order=created_at.desc&limit=50

GET {URL}/rest/v1/atrasos?dias_atraso=gte.3&select=*&order=dias_atraso.desc

GET {URL}/rest/v1/pagos?estado=eq.confirmado&confirmado_at=gte.2026-08-05T05:00:00Z&select=id,user_id,monto,medio_pago_admin,contexto_pago,confirmado_at
```

> Las 05:00Z ≈ inicio del día Bogotá (UTC−5). Ajusta si hay DST (Colombia no usa DST).

---

## 7. Plantillas de salida (usa estas, no improvises)

### 7.1 Informe diario

```markdown
# Informe diario — {Garrido|Pinilla} — {YYYY-MM-DD} (America/Bogota)

## 1. Pulso operativo
| Cola | Pendientes |
| --- | ---: |
| Créditos | N |
| Pagos por confirmar | N |
| Lista retiro | N |
| Entregas | N |
| Morosos | N |
| Por recoger | N |

## 2. Caja / recaudos
- Estado sesión: {abierta|cerrada|sin apertura}
- Efectivo esperado: $X
- Nequi: $X · Davivienda: $X
- Ventas producto: $X (n tickets)
- Ventas moto contado: $X (n)
- Pagos crédito confirmados: $X
- Egresos: $X → Neto día: $X

## 3. Inventario (alertas)
- Quiebres: …
- Bajo mínimo: …

## 4. Cartera / mora (top 5)
| Cliente | Cédula | Días | Adeudado |
| --- | --- | ---: | ---: |

## 5. Acciones recomendadas (máx. 5)
1. …
```

### 7.2 Informe de inventarios

```markdown
# Inventario — {sede} — {fecha}

## Resumen
- SKUs activos: N · Valor a precio: $X · Valor a costo: $Y
- Bajo mínimo: N · Sin stock: N

## Críticos (stock ≤ mínimo)
| SKU | Nombre | Stock | Mín | Precio |

## Garaje
| Estado | Cantidad |
## Catálogo motos (bike_table)
| Modelo | Color | Stock |
```

### 7.3 Informe de ventas

```markdown
# Ventas — {sede} — {desde} → {hasta}

## Productos (tienda)
- Tickets: N · Cobrado: $X · Ticket prom.: $Y
## Motos contado
- Unidades: N · Cobrado: $X
## Crédito (referencia, no sumar al contado)
- Entregadas en calle: N · Liquidadas en periodo: N

## Top productos
| SKU | Unidades | $ |
```

### 7.4 Ficha cliente

```markdown
# Cliente {nombre} — {sede} — userId {id}
- Cédula: … · Celular: …
- Pipeline: credito/contrato/moto/pago/entrega/visita → estados
- Compra: modelo … placa … estado …
- Atraso: {al_día|N días} · Adeudado: $X
- Últimos pagos: …
- Próxima acción sugerida: …
```

**Formato de dinero:** `$1.250.000` (punto miles, sin decimales).  
**Nunca** inventes un cliente o un total si la tool falló: di el error.

---

## 8. System prompt sugerido (pegar en Hermes)

```
Eres Hermes SP Ops. Operas dos paneles spappweb independientes:
- garrido → https://s-papp-mauve.vercel.app (Soluciones Garrido, Girardot)
- pinilla → https://sp-bogota.vercel.app (Soluciones Pinilla)

Reglas:
1) Identifica siempre la sede antes de consultar.
2) Prefiere tools garrido__* / pinilla__* (o el plugin activo).
3) Modo default: solo lectura e informes. Mutaciones solo si el humano lo pide claro.
4) COP enteros, fechas America/Bogota, español Colombia.
5) No mezclar IDs ni sumar carteras entre sedes sin etiquetar.
6) Para caja usa REST/SQL (no hay tool). En Pinilla, ventas POS también pueden requerir REST.
7) Antes de actuar sobre un cliente: search_clients → get_client_pipeline.
8) Entrega informes con las plantillas del playbook HERMES_DUAL_PLAYBOOK.md.
9) Si una tool falla, reporta el error y prueba el fallback REST de esa sede.
10) No expongas API keys ni pegues dumps crudos enormes: resume y destaca outliers.
```

Carga también el `AGENT_CONTEXT.md` de cada repo cuando profundices en mutaciones
de esa sede.

---

## 9. Gaps conocidos y upgrades

| Gap | Impacto | Upgrade mínimo |
| --- | --- | --- |
| Sin tool `get_caja_sesion` / `get_informe_diario` | Informes diarios dependen de REST | Exponer en `registry.ts` wrappers de `getCajaSesionHoy` |
| Pinilla sin `list_ventas_*` | Ventas POS solo por REST | Portar tools desde SPapp registry |
| Plugin single-URL | Hay que duplicar plugin | Plugin dual nativo con prefijos |
| RLS off + agent abierto | Riesgo alto en prod | `AGENT_API_KEY` + red privada; RLS a medio plazo |
| Sin export CSV nativo | Informes en markdown/chat | Generar tablas MD / CSV en la respuesta del agente |

Cuando existan las tools nuevas, **no hay que editar este playbook a mano para el
catálogo**: Hermes las descubre solo. Sí actualiza las secciones §5.2 / §5.4.

---

## 10. Checklist de aceptación (“world-class”)

Hermes está listo cuando:

- [ ] Plugins `sp-garrido` y `sp-pinilla` cargan sin error
- [ ] `inbox_queues` responde en ambas sedes
- [ ] Puede emitir Informe Diario Garrido y Pinilla el mismo día
- [ ] Separa contado vs crédito vs caja
- [ ] Detecta stock bajo y top mora
- [ ] Rehúsa mutar sin pedido explícito
- [ ] Nunca mezcla `userId` entre sedes
- [ ] Formatea COP y usa fecha Bogotá
- [ ] Si falta tool, cae a REST documentado en §6

---

## 11. Referencias en código

| Recurso | Garrido (SPapp) | Pinilla (SPBogota) |
| --- | --- | --- |
| Contexto dominio | `spappweb/AGENT_CONTEXT.md` | igual path en su repo |
| Plugin | `spappweb/integrations/hermes/` | igual |
| Registry tools | `src/lib/agent/registry.ts` | igual |
| Queries | `src/lib/pipeline/queries.ts` | igual |
| Caja | `src/lib/actions/caja-actions.ts` + `src/lib/caja/caja-informe.ts` | igual |
| Env Supabase | `src/lib/supabase/public-env.ts` | igual |
| Events WhatsApp | `integrations/hermes/PIPELINE_EVENTS.md` | igual |

---

## 12. Ejemplos de prompts al agente

- «Briefing diario de **ambas** sedes.»
- «Inventario crítico en Garrido: qué comprar esta semana.»
- «Ventas de productos de ayer en Pinilla y ticket promedio.»
- «Top 10 mora Pinilla con celular y días de atraso.»
- «Ficha completa del cliente cédula 1097… en Garrido.»
- «Compara recaudos de caja de hoy Garrido vs Pinilla (sin mezclar carteras).»
- «¿Cuántas motos hay en garaje disponibles en cada sede?»

---

*Playbook dual SP · para Hermes Agent · mantener junto a `integrations/hermes/README.md`.*
