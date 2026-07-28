# Wilmas Fashion

Proyecto ecommerce académico: React 18/Vite/Tailwind en `frontend/`; Express 4/Prisma/PostgreSQL/JWT en `backend/`.

Incluye:
- flujo de pedido, pago y facturación;
- proveedores configurables por entorno (`mock` y reales);
- tracking de envío manual inicial;
- worker persistente con PostgreSQL para trabajos de factura.
- guías de prueba local para PayPhone, facturación y envíos en `docs/`.

## Desarrollo local

1. Inicia Docker Desktop y ejecuta `docker compose -f docker-compose.postgres.yml up -d`.
2. Copia `backend/.env.example` a `backend/.env`, usa secretos locales y confirma `DATABASE_URL` PostgreSQL.
3. En `backend/`: `npm ci`, `npx prisma generate`, `npx prisma migrate deploy`, `npm test`, `npm start`.
4. Para worker de facturación: en `backend/` ejecuta `npm run worker`.
4. En `frontend/`: ejecuta `npm ci`, `npm test`, `npm run dev`. El proxy de Vite envía `/api` y `/uploads` a `127.0.0.1:4000`; `VITE_API_BASE` solo es necesario en despliegues con orígenes separados.

Scripts de desarrollo local adicionales en `backend/scripts/dev/`:
- `npm run dev:list-invoices`
- `npm run dev:show-jobs`
- `npm run dev:enqueue-invoice-job`
- `npm run dev:insert-test-job`

No ejecutar seed, `db push` productivo ni importar a RDS sin autorización/respaldo. Nunca publicar `.env`, bases, exports, tfstate, certificados o credenciales.

## Permisos y API

- Visitante: catálogo, detalle, carrito, registro y login.
- USER: productos (sin eliminar), uploads, pedidos propios, facturas y tracking de sus pedidos.
- ADMIN: eliminar productos, usuarios/roles, todos los pedidos, pagos, invoices, envíos y analítica.

El registro fuerza USER y el backend vuelve a consultar usuario/rol en cada petición. Rutas nuevas: `/api/orders`, `/api/payments`, `/api/invoices`, `/api/uploads`, `/api/orders/:orderId/shipment`, `/api/orders/:orderId/tracking`; se mantienen productos, usuarios y ventas históricas. `/api/ping` verifica PostgreSQL.

Configuración principal por entorno:
- `PAYMENT_PROVIDER=mock|payphone`
- `INVOICE_PROVIDER=mock|datil`
- `EMAIL_PROVIDER=console|ses`
- `SHIPPING_PROVIDER=manual|mock|laar`

## Verificación

```text
backend: npm ci; npx prisma generate; npx prisma validate; npm test; node --check src/app.js; node --check src/server.js
frontend: npm ci; npm test; npm run build
terraform: terraform fmt -check -recursive; terraform init -backend=false; terraform validate
```

Documentación clave:
- [DEPLOYMENT.md](DEPLOYMENT.md)
- [docs/payphone-local-testing.md](docs/payphone-local-testing.md)
- [docs/invoice-worker.md](docs/invoice-worker.md)
- `docs/payphone-integration.md`
- `docs/datil-integration.md`
- `docs/email-notifications.md`
- `docs/manual-shipping.md`
- `docs/production-checklist.md`
