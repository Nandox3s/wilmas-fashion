# Shipping manual

## Proveedor inicial
- `SHIPPING_PROVIDER=manual`

## Endpoints cliente
- `GET /api/orders/:orderId/shipment`
- `GET /api/orders/:orderId/tracking`

## Endpoints admin
- `POST /api/admin/orders/:orderId/shipment`
- `PATCH /api/admin/shipments/:shipmentId`
- `POST /api/admin/shipments/:shipmentId/events`
- `POST /api/admin/shipments/:shipmentId/mark-shipped`
- `POST /api/admin/shipments/:shipmentId/mark-delivered`

## Reglas
- URL de tracking solo `http/https`.
- Cambios de estado generan `ShipmentEvent`.
- Marcar entregado actualiza estado del pedido cuando aplica.
- El historial es de solo append: no se reescriben eventos previos.
- El pedido debe estar pagado antes de registrar un envío.
