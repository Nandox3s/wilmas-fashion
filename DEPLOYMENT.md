# Despliegue de Wilmas Fashion

## Estado

La aplicación puede operar inicialmente con Vercel/Render para el storefront y Render/EC2 o Lightsail para el backend, mientras AWS queda preparada como opción de escalado y backup. Los pagos, facturas y envíos siguen usando proveedores mock por defecto y nunca deben activarse en producción sin aprobación explícita.

## Backend

Node 20 arranca con `npm start`; `app.js` no abre puerto y `server.js` maneja SIGINT/SIGTERM. Ejecutar `npm run migrate:deploy` una sola vez como paso separado. No ejecutar `db push` ni seed en producción. Validar `/api/ping` y logs antes de tráfico.

Para facturación asíncrona ejecutar además `npm run worker`. El worker persiste en PostgreSQL y usa los jobs de `Job`/`Invoice` para emitir documentos de prueba o reales según el proveedor configurado.

Elastic Beanstalk está parametrizado en Terraform y deshabilitado en dev. SingleInstance reduce costo, pero HTTPS productivo requiere una decisión adicional documentada en `docs/backend-deployment.md` y `docs/domain-and-https.md`.

## Frontend

Compilar con `npm run build` en `frontend/`. Configurar `VITE_API_BASE` y `VITE_CHECKOUT_MODE` según entorno. El flujo de checkout, pagos mock/sandbox y la vista de detalle de pedidos deben probarse con la configuración local del backend.

## Secuencia segura

1. Leer `docs/backup-and-rollback.md` y crear/verificar respaldo.
2. Validar Docker/PostgreSQL y ejecutar pruebas completas.
3. Ejecutar pruebas backend/frontend y validar endpoints de pago, factura y envío.
4. Confirmar variables de proveedor real solo en backend (`PAYPHONE_*`, `DATIL_*`, `SES_*`).
5. Mantener `mock` en CI y en ambientes de desarrollo.
6. Revisar `terraform plan`, costo y cero destrucciones antes de cambios productivos.
7. Obtener aprobación explícita antes de `terraform apply` o migración productiva/DNS.
8. Seguir `docs/production-cutover.md` y mantener Render/Vercel como rollback mientras se estabiliza AWS.

## Pruebas locales
- PayPhone mock local: `docs/payphone-local-testing.md`
- Worker de facturación: `docs/invoice-worker.md`
- Integración Dátil: `docs/datil-integration.md`
- Envíos manuales: `docs/manual-shipping.md`

Si GitHub Actions no inicia por facturación, distinguir job no iniciado de código fallido. No usar access keys permanentes ni exponer secretos en frontend o logs.
