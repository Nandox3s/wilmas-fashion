# Cutover de producción

Requiere segunda aprobación: mantenimiento/solo lectura, backup SQLite/uploads, export+validación, `pg_dump`, import idempotente, conteos y conciliación, deploy backend, smoke tests, cambiar `VITE_API_BASE`, desplegar Amplify y monitorear. Verificar login, roles, SKU, stock, carrito, pedido sandbox, pago sandbox e invoice sandbox.

Criterios de rollback: errores 5xx, diferencias de datos, auth rota, stock negativo o conciliación fallida. Revertir frontend a Vercel/Render, detener escrituras AWS, preservar evidencias y restaurar en bases/buckets nuevos. No eliminar servicios anteriores hasta una ventana estable acordada.
