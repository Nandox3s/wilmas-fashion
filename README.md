# Wilmas Fashion

Proyecto ecommerce académico de tienda boutique con React 18/Vite/Tailwind en `frontend/` y Express 4/Prisma/PostgreSQL/JWT en `backend/`. Mantiene el catálogo local como fallback y el carrito `wf_cart`, y ofrece un flujo de pedido, pago, facturación, correos y seguimiento de envíos que puede ejecutarse en modo mock o con proveedores reales por configuración.

## Desarrollo local

1. Inicia Docker Desktop y ejecuta `docker compose -f docker-compose.postgres.yml up -d`.
2. Copia `backend/.env.example` a `backend/.env`, usa secretos locales y confirma `DATABASE_URL` PostgreSQL.
3. En `backend/`: `npm ci`, `npx prisma generate`, `npx prisma migrate deploy`, `npm test`, `npm start`.
4. Para worker de facturación: en `backend/` ejecuta `npm run worker`.
5. En `frontend/`: ejecuta `npm ci`, `npm test`, `npm run dev`. El proxy de Vite envía `/api` y `/uploads` a `127.0.0.1:4000`; `VITE_API_BASE` solo es necesario en despliegues con orígenes separados.

Scripts de desarrollo locales adicionales en `backend/scripts/dev/`:
- `npm run dev:list-invoices`
- `npm run dev:show-jobs`
- `npm run dev:enqueue-invoice-job`
- `npm run dev:insert-test-job`

No ejecutar seed, `db push` productivo, ni importar a RDS sin autorización/respaldo. Nunca publicar `.env`, bases, exports, tfstate, certificados o credenciales.

## Permisos y API

- Visitante: catálogo, detalle, carrito, registro y login.
- USER: productos (sin eliminar), uploads, pedidos propios, facturas, pagos y tracking de sus pedidos.
- ADMIN: eliminar productos, usuarios/roles, todos los pedidos, pagos, invoices, envíos y analítica.

El registro fuerza USER y el backend vuelve a consultar usuario/rol en cada petición. Rutas principales: `/api/orders`, `/api/payments`, `/api/invoices`, `/api/uploads`, `/api/orders/:orderId/shipment`, `/api/orders/:orderId/tracking`, `/api/admin/orders` y `/api/admin/shipments`. Se mantienen productos, usuarios y ventas históricas. `/api/ping` verifica PostgreSQL.

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
- [docs/datil-integration.md](docs/datil-integration.md)
- [docs/email-notifications.md](docs/email-notifications.md)
- [docs/manual-shipping.md](docs/manual-shipping.md)
- [docs/production-checklist.md](docs/production-checklist.md)
- [docs/aws-full-budget-lightsail.md](docs/aws-full-budget-lightsail.md)
