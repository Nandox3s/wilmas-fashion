# Perfiles de despliegue AWS

## aws-minimal-hybrid

Mantiene temporalmente el frontend en Vercel y el backend en Render. Su plan habilita únicamente los buckets S3 privados, con cifrado, lifecycle, bloqueo público y versionado para facturas. SQS, roles IAM de runtimes, CloudWatch dedicado, RDS, red y backend AWS permanecen apagados hasta tener consumidores configurados.

Con poco almacenamiento y tráfico, el costo esperado es cercano a centavos y menor a USD 5 mensuales. Render necesitará una identidad temporal o un mecanismo de credenciales aprobado antes de usar S3; no deben crearse claves permanentes improvisadas.

## aws-full

Representa el destino completo: frontend AWS, backend AWS, PostgreSQL persistente, S3, SQS y worker, SES, CloudWatch, HTTPS, secretos administrados, backups y recuperación. El archivo se mantiene como ejemplo no aplicable hasta reemplazar placeholders, publicar el worker probado y aprobar el costo.

| Opción | Ventajas | Desventajas | Dificultad operativa | Costo mensual orientativo |
|---|---|---|---|---|
| Lightsail | Precio predecible, modelo sencillo y compatible con Node/Express/Prisma | PostgreSQL en la misma VM reduce aislamiento; una base separada eleva el costo; exige mantenimiento del sistema | Media | USD 5–25 según separación de base y backups |
| Elastic Beanstalk + RDS | Poca reescritura, healthchecks y rollback administrados | RDS y cómputo continuo superan USD 5; más componentes de red | Media | USD 30–60 sin ALB; mayor con ALB y tráfico |
| App Runner + RDS | HTTPS y contenedores administrados; menor operación que ECS | Costo base continuo, RDS separado y consideraciones de red | Baja-media | USD 35–70 |

Para el presupuesto universitario se recomienda `aws-minimal-hybrid`. Si se aprueba un presupuesto de producción superior, Elastic Beanstalk de instancia única con RDS requiere menos cambios al código actual. Lightsail es la alternativa económica cuando se acepta administrar más sistema operativo y recuperación de PostgreSQL.

Las cifras son estimaciones orientativas, no cotizaciones. Deben confirmarse en AWS Pricing Calculator antes de aplicar infraestructura.
