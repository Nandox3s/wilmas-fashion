# PayPhone local testing

## Objetivo
Validar el flujo PayPhone sin servicios reales usando solo el montaje local del backend y el checkout mock del frontend.

## Condiciones
- `PAYMENT_PROVIDER=mock`
- `PAYPHONE_MOCK_SERVER_ENABLED=true`
- `NODE_ENV!=production`
- `VITE_CHECKOUT_MODE=mock` o `sandbox`

## Rutas locales
- `POST /mock-payphone/button/Prepare`
- `POST /mock-payphone/button/V2/Confirm`
- `GET /mock-payphone/checkout`

## Validación
- La ruta mock no debe montarse cuando `PAYPHONE_MOCK_SERVER_ENABLED=false`.
- La ruta mock no debe montarse cuando `NODE_ENV=production`.
- El checkout mock del frontend no debe incluirse en producción.

## Prueba recomendada
1. Crear usuario y pedido con la API local.
2. Ejecutar `POST /api/payments/payphone/prepare`.
3. Confirmar una vez.
4. Repetir confirmación y webhook para verificar idempotencia.
