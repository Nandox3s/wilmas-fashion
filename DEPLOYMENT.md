# Despliegue de Wilmas Fashion

## Estado

Frontend y backend pueden mantenerse en Vercel/Render para operación económica inicial. No se requiere migración completa a AWS en esta fase. No desplegar pagos/invoices reales sin aprobación: `mock` es el default.

## Backend

Node 20 arranca con `npm start`; `app.js` no abre puerto y `server.js` maneja SIGINT/SIGTERM. Ejecutar `npm run migrate:deploy` una sola vez como paso separado. No ejecutar `db push` ni seed en producción. Validar `/api/ping` y logs antes de tráfico.

Para facturación asíncrona ejecutar además `npm run worker`.

Elastic Beanstalk está parametrizado en Terraform y deshabilitado en dev. SingleInstance reduce costo, pero HTTPS productivo requiere una decisión adicional documentada en `docs/backend-deployment.md` y `docs/domain-and-https.md`.

## Frontend

Compilar con `npm run build` en `frontend/`. Configurar `VITE_API_BASE` y `VITE_CHECKOUT_MODE` según entorno.

## Secuencia segura

1. Leer `docs/backup-and-rollback.md` y crear/verificar respaldo.
2. Validar Docker/PostgreSQL y ejecutar pruebas completas.
3. Ejecutar pruebas backend/frontend y validar endpoints de pago/factura/envío.
4. Confirmar variables de proveedor real solo en backend (`PAYPHONE_*`, `DATIL_*`, `SES_*`).
5. Mantener `mock` en CI y en ambientes de desarrollo.
6. Usar checklist de `docs/production-checklist.md` antes de cualquier cambio productivo.

## Pruebas locales
- PayPhone mock local: `docs/payphone-local-testing.md`
- Worker de facturación: `docs/invoice-worker.md`
- Integración Dátil: `docs/datil-integration.md`
- Envíos manuales: `docs/manual-shipping.md`

No usar access keys permanentes ni exponer secretos en frontend o logs.
