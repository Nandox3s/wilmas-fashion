# Integracion PayPhone

## Resumen
- Proveedor habilitado por `PAYMENT_PROVIDER`.
- `mock` es el valor por defecto para desarrollo y CI.
- `payphone` se activa solo con credenciales en backend.

## Endpoints
- `POST /api/payments/payphone/prepare`
- `POST /api/payments/payphone/confirm`
- `POST /api/webhooks/payphone`
- `POST /api/admin/payments/:paymentId/reverse`
- `POST /api/admin/payments/:paymentId/refund`

## Variables
- `PAYPHONE_ENV`
- `PAYPHONE_TOKEN`
- `PAYPHONE_STORE_ID`
- `PAYPHONE_CLIENT_TRANSACTION_PREFIX`
- `PAYPHONE_RESPONSE_URL`
- `PAYPHONE_ALLOWED_DOMAIN`

## Seguridad
- Token solo en backend.
- Confirmacion idempotente por eventos y estados.
- No se almacenan PAN/CVV/expiracion completa.
