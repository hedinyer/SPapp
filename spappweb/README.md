# SP Admin (spappweb)

Panel administrativo Next.js para gestionar el pipeline de crédito, visitas y motos de la app Flutter.

## Requisitos

- Node.js 20+
- Proyecto Supabase con las migraciones del repo aplicadas
- Usuario en `users` con `status = 'admin'`

## Configuración local

```bash
cd spappweb
npm install
npm run dev
```

Las credenciales Supabase y `SESSION_SECRET` están embebidas en `src/lib/supabase/env.ts` (no hace falta `.env.local`).

Abre [http://localhost:3000](http://localhost:3000) — redirige a login o bandeja.

## Marcar un usuario como admin

Tras aplicar las migraciones de `users.status`:

```sql
UPDATE public.users SET status = 'admin' WHERE "user" = 'tu_usuario_admin';
```

## Deploy en Vercel

1. Importa el repositorio en Vercel.
2. **Root Directory:** `spappweb`
3. Deploy (sin variables de entorno; las keys están en `src/lib/supabase/env.ts`).

## Estructura

- `/inbox` — Bandeja con colas accionables
- `/clientes/[userId]` — Pipeline del cliente con stepper
- `/visitadores` — CRUD visitadores
- `/catalogo` — CRUD catálogo `bike_table`
