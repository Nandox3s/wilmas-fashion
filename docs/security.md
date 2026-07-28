# Seguridad

## Controles activos
- Helmet y CORS con allowlist.
- JWT + RBAC con validacion de usuario en base de datos.
- Rate limit en autenticacion.
- Validaciones de payload en backend.
- Idempotencia de pagos por `idempotencyKey` y eventos de proveedor.
- Transacciones Prisma para operaciones criticas.
- Historial de notificaciones y eventos de pago/factura/envio.

## Reglas de datos sensibles
- No almacenar PAN completo, CVV, expiracion completa ni tokens de tarjeta.
- No exponer `PAYPHONE_TOKEN`, `DATIL_API_KEY` o secretos en frontend.
- Sanitizar respuestas de proveedor antes de persistir/loggear.

## Recomendaciones operativas
- Mantener `mock` en desarrollo y CI.
- Activar proveedores reales solo por variables de entorno en backend.
- Revisar transiciones de estado y errores `409` antes de reintentos manuales.
