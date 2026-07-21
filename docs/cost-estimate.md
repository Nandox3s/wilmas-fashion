# Estimación de costos

Estimación orientativa, no cotización: S3/SQS/CloudWatch de una demo pequeña suelen ser centavos o pocos dólares según uso. RDS `db.t4g.micro` y EC2/Elastic Beanstalk encendidos todo el mes normalmente superan por sí solos USD 5; ALB añade un costo base relevante. Secrets Manager cobra por secreto y operación. NAT Gateway queda excluido.

Plan reducido: mantener Render/Vercel/PostgreSQL local, crear solo buckets/colas/logs y borrar tras la demo. Plan completo: RDS+EB solo durante ventanas cortas, con presupuesto/alarma, o aceptar un presupuesto superior. Confirmar precios actuales con AWS Pricing Calculator antes de apply.
