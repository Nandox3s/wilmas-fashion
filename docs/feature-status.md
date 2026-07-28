# Wilmas Fashion — Estado de funcionalidades

> Este archivo es informativo. La documentación oficial está en `docs/`.

## Completado

- PayPhone mock endpoints: implementados y bloqueados por entorno (`PAYPHONE_MOCK_SERVER_ENABLED`). ✅
- E2E PayPhone: idempotencia completa con conteos directos en PostgreSQL (prepare, confirm×2, webhook×2, worker×2). ✅
- `normalizeProductSizes`: implementado, integrado y con pruebas exhaustivas. ✅
- `MockInvoiceProvider`: XML y PDF con avisos en español e inglés. ✅
- `DatilProvider`: adaptador completo con cliente inyectable, validación, sanitización, tests contractuales. ✅
- `DbJobQueue` + `jobWorker`: bloqueo atómico, `lockedAt`, `lockedBy`, backoff exponencial, jitter, SIGINT/SIGTERM, `WORKER_RUN_ONCE`. ✅
- Pruebas de concurrencia del worker. ✅
- `ConsoleEmailProvider`: templates para invoice, shipped, delivered, payment; HTML + texto plano; previews en `tmp/emails/`. ✅
- `EmailService`: reintentos, registro de estado, no bloquea flujo principal. ✅
- Envío manual: crear, actualizar, agregar evento, marcar enviado, marcar entregado, historial. ✅
- Panel administrativo: pedidos conectados a endpoints reales, detalle con factura/envío/acciones. ✅
- Vista del cliente: estado de pago, factura, descarga PDF/XML, transportista, guía, seguimiento, timeline. ✅
- Migración revisada con datos concretos del SQL y schema actuales. ✅
- Scripts dev en `scripts/dev/` con bloqueo en producción y README actualizado. ✅

## Bloqueado externamente

- `DatilProvider` operaciones reales: requieren rutas, payloads y cabeceras oficiales del sandbox de Dátil. Ver `docs/datil-integration.md`.
- `SesEmailProvider`: requiere credenciales AWS SES reales.
- `LaarShippingProvider`: requiere credenciales Laar reales.
- `S3StorageProvider`: requiere bucket S3 configurado.
