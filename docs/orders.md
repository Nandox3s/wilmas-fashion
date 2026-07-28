# Pedidos

`POST /api/orders` requiere JWT, datos del cliente e items `{productId, size, color, quantity}`. El servidor ignora precios del navegador, consulta productos, redondea en centavos, calcula descuento/IVA/envío configurables y crea `Order`, `OrderItem` y reservas en una transacción. El stock se reserva al crear y se confirma una sola vez al aprobar; un rechazo libera e incrementa una sola vez.

Consultas: `GET /api/orders/my-orders`, `GET /api/orders/:reference` y `GET /api/admin/orders`. Propiedad se valida en backend. Falta programar la liberación automática de reservas vencidas; es requisito previo a producción.
