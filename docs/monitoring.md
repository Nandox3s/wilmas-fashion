# Monitoreo

Logs JSON incluyen nivel, evento, referencia y timestamp; omiten secretos, JWT, tarjeta, CVV, certificados y datos personales completos. Retención dev: 7 días. Terraform alarma edad de SQS y mensajes DLQ.

Antes de producción agregar métricas verificadas para HTTP 500, EB unhealthy, RDS CPU/conexiones, invoice ERROR, pago aprobado sin PAID y stock negativo. Las alarmas sin canal de notificación no alertan: añadir SNS/email solo con `<BUDGET_EMAIL>` autorizado.
