# SP Admin (spappweb)

Panel administrativo Next.js para gestionar el pipeline de crédito, visitas y motos de la app Flutter.

## Requisitos

- Node.js 20+
- Proyecto Supabase con las migraciones del repo aplicadas
- Usuario en `users` con `status = 'admin'`

## Configuración local

```bash
cd spappweb
cp .env.local.example .env.local
# Editar .env.local con tus credenciales Supabase
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) — redirige a login o bandeja.

## Marcar un usuario como admin

Tras aplicar las migraciones de `users.status`:

```sql
UPDATE public.users SET status = 'admin' WHERE "user" = 'tu_usuario_admin';
```

## Deploy en Vercel

1. Importa el repositorio en Vercel.
2. **Root Directory:** `spappweb`
3. Variables de entorno (Production + Preview):

| Variable | Tipo |
|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Plain |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Plain |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret (opcional en local) | Mutaciones admin; si falta, usa anon key |
| `SESSION_SECRET` | Secret |

4. Deploy.

## Estructura

- `/inbox` — Bandeja con colas accionables
- `/clientes/[userId]` — Pipeline del cliente con stepper
- `/visitadores` — CRUD visitadores
- `/catalogo` — CRUD catálogo `bike_table`
