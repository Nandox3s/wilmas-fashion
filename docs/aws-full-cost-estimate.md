# Estimación de costos AWS full

Estimación orientativa para `us-east-1`, 730 horas mensuales y tráfico universitario bajo; no es cotización ni garantía.

| Componente | Mínimo mensual | Normal | Tipo |
|---|---:|---:|---|
| EC2 `t3.micro` de EB | USD 7.60 | USD 7.60–10 | Continuo; créditos CPU pueden sumar costo |
| IPv4 pública de EC2 | USD 3.65 | USD 3.65 | Continuo mientras exista |
| EBS raíz 8–10 GB | USD 0.65 | USD 0.80–1.50 | Continuo por GB |
| RDS PostgreSQL `db.t4g.micro` | USD 12–15 | USD 15–20 | Continuo sin tráfico |
| RDS gp3 20 GB y backups | USD 2–3 | USD 3–5 | Continuo/variable |
| Amplify | USD 0.05 | USD 0.50–3 | Minutos, almacenamiento y transferencia |
| S3 | < USD 0.10 | USD 0.10–1 | Variable |
| Secrets Manager, dos secretos | ~USD 0.80 | USD 0.80–1 | Por secreto y API |
| CloudWatch, logs y cinco alarmas | ~USD 0.50 | USD 1–3 | Alarmas e ingestión |
| CloudFront HTTPS API | < USD 0.10 | USD 0.50–3 | Solicitudes y transferencia |
| SQS/Lambda/SES | USD 0 desactivados | Centavos con demo pequeña | Variable al habilitar |
| Transferencia | USD 0 con franquicia aplicable | USD 1–10+ | Variable |

Total mínimo esperado sin promociones: aproximadamente USD 28–33/mes. Uso normal pequeño: USD 35–50/mes. RDS, EC2, IPv4, EBS y Secrets Manager cuestan incluso con cero visitas.

Elastic Beanstalk no añade tarifa propia. No hay NAT Gateway, ALB ni Multi-AZ. Detener EC2 reduce cómputo, no EBS ni todos los cargos IPv4. RDS detenido se reinicia tras el límite del servicio; eliminarlo exige snapshot final. Eliminar Amplify/CloudFront corta frontend/API HTTPS. `force_destroy=false` protege buckets con objetos. Eliminar secretos impide arrancar y tiene ventana de recuperación.

Para reducir costo: mantener Vercel/Render, encender AWS full solo durante demostraciones, retener logs siete días, limitar builds y dejar worker/SES apagados. Confirmar con AWS Pricing Calculator antes de aplicar.
