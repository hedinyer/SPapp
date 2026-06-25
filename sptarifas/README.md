# sptarifas

Web para registrar pagos de tarifa (transferencia Nequi) leyendo el comprobante con OCR
y asociandolo a la placa del cliente. Escribe en la BD Railway/viaduct (backend Django).

## Local

```bash
npm install
npm run dev
```

Requiere `.env.local` con:

```
DATABASE_URL_VIADUCT=postgresql://USER:PASS@HOST:PORT/DB
```

## Deploy (Vercel)

- Importar este directorio como proyecto Next.js.
- Definir la variable de entorno `DATABASE_URL_VIADUCT` (Production + Preview).

## Notas

- Sin login: cualquiera con la URL puede registrar pagos.
- El reparto es FIFO (factura mas antigua primero); el excedente final se guarda como prepago.
- `npm run check:fifo` corre el self-check de la logica de reparto.
