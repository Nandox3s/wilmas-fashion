# Pagos

`PAYMENT_PROVIDER=mock` y `CHECKOUT_MODE=demo` son los defaults. Mock simula aprobado/rechazado/error. `POST /api/payments/create` exige idempotency key; `POST /api/payments/confirm` concilia contra el pedido; callbacks repetidos se deduplican por proveedor/evento. Nunca se almacenan PAN, CVV o expiración.

PayPhone usa el flujo oficial Button Prepare y V2 Confirm, montos enteros en centavos y Bearer token. La notificación externa requiere autorización previa del proveedor; la confirmación oficial es la fuente de verdad. Sandbox exige dominio/response URL registrados y credenciales. Referencias: [Botón PayPhone](https://docs.payphone.app/boton-de-pago) y [notificación externa](https://docs.payphone.app/notificacion-externa).

No habilitar `production` sin revisión de monto, moneda, referencia, URLs y pruebas sandbox. Los reversos reales requieren aprobación explícita.
