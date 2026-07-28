# Notificaciones por correo

## Proveedores
- `EMAIL_PROVIDER=console` (default)
- `EMAIL_PROVIDER=ses`

## Plantillas base
- Pedido recibido
- Pago aprobado
- Pago rechazado
- Factura autorizada
- Pedido enviado
- Pedido entregado
- Error de factura

## Historial
Cada envio registra `Notification` con:
- `type`
- `recipient`
- `status`
- `provider`
- `attempts`
- `sentAt`
- `lastError`
- `orderId`
