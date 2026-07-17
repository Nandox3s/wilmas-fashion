# Wilmas Fashion

Prototipo académico de tienda boutique. Usa React 18, Vite 5 y Tailwind CSS en `frontend/`; Express 4, Prisma 5, JWT y SQLite en `backend/`. El checkout es exclusivamente demostrativo: no procesa dinero ni almacena tarjetas.

## Desarrollo local

1. En `backend/`, crea `.env` con `DATABASE_URL=file:./dev.db`, `JWT_SECRET` y opcionalmente `PORT=4000` y `CORS_ORIGINS` (lista separada por comas).
2. Ejecuta `npm install`, `npx prisma generate`, `npx prisma db push` y `npm start`.
3. En `frontend/`, configura opcionalmente `VITE_API_BASE=http://localhost:4000`, ejecuta `npm install` y `npm run dev`.

No ejecutes `npm run seed` sin confirmar que deseas reemplazar datos. Nunca publiques `.env`, `dev.db`, `node_modules` ni credenciales.

## Permisos

- Visitante: catálogo, detalle, carrito y checkout demostrativo.
- `USER`: además crea y actualiza productos, precio, descuento, stock e imágenes.
- `ADMIN` (Administrador o Jefe en la interfaz): además elimina productos, consulta ventas/analíticas y administra roles.

El registro público siempre asigna `USER`; solo `ADMIN` puede cambiar un rol a `USER` o `ADMIN`. La API valida el usuario y rol del JWT en cada operación privada.

## API

- Públicos: `GET /api/ping`, `GET /api/products`, `GET /api/products/:id`.
- `USER`/`ADMIN`: `POST /api/products`, `PUT /api/products/:id`, `PATCH /api/products/:id/price`, `PATCH /api/products/:id/stock`, `POST /api/upload`.
- `ADMIN`: `DELETE /api/products/:id`, `GET /api/sales`, `GET /api/analytics/dashboard`, `GET /api/users`, `PATCH /api/users/:id/role`.

El catálogo usa la API como fuente prioritaria por SKU y conserva `frontend/src/data/products.js` como respaldo si la API no responde.

## Verificación

- Backend: `npx prisma validate`, `node --check src/index.js`, `npm test`.
- Frontend: `npm test`, `npm run build`.

Consulta [DEPLOYMENT.md](DEPLOYMENT.md) para Vercel y Render.
