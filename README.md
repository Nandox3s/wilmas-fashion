# Wilmas Fashion

Proyecto académico de tienda boutique: React 18/Vite/Tailwind en `frontend/`; Express 4/Prisma/PostgreSQL/JWT en `backend/`. Conserva catálogo local como fallback y carrito `wf_cart`. Pagos y facturas usan proveedores mock por defecto; no procesan dinero ni emiten comprobantes tributarios.

## Desarrollo local

1. Inicia Docker Desktop y ejecuta `docker compose -f docker-compose.postgres.yml up -d`.
2. Copia `backend/.env.example` a `backend/.env`, usa secretos locales y confirma `DATABASE_URL` PostgreSQL.
3. En `backend/`: `npm ci`, `npx prisma generate`, `npx prisma migrate deploy`, `npm test`, `npm start`.
4. En `frontend/`: configura `VITE_API_BASE=http://localhost:4000` y `VITE_CHECKOUT_MODE=demo`; ejecuta `npm ci`, `npm test`, `npm run dev`.

No ejecutar seed, `db push` productivo ni importar a RDS sin autorización/respaldo. Nunca publicar `.env`, bases, exports, tfstate, certificados o credenciales.

## Permisos y API

- Visitante: catálogo, detalle, carrito, registro y login.
- USER: productos (sin eliminar), uploads, pedidos propios y facturas propias.
- ADMIN: eliminar productos, usuarios/roles, todos los pedidos, pagos, invoices y analítica.

El registro fuerza USER y el backend vuelve a consultar usuario/rol en cada petición. Rutas nuevas: `/api/orders`, `/api/payments`, `/api/invoices`, `/api/uploads`; se mantienen productos, usuarios y ventas históricas. `/api/ping` verifica PostgreSQL.

## Verificación

```text
backend: npm ci; npx prisma generate; npx prisma validate; npm test; node --check src/app.js; node --check src/server.js
frontend: npm ci; npm test; npm run build
terraform: terraform fmt -check -recursive; terraform init -backend=false; terraform validate
```

La guía principal está en [DEPLOYMENT.md](DEPLOYMENT.md); auditoría, rollback, seguridad y costos están en `docs/`.
