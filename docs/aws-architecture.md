# Arquitectura AWS propuesta

Flujo: Amplify sirve React; Elastic Beanstalk ejecuta Express; RDS PostgreSQL privado conserva datos; S3 separa imágenes y facturas; SQS/DLQ desacopla facturación; un worker procesa invoices; SES envía notificaciones y CloudWatch centraliza logs/alarmas. Secrets Manager entrega la credencial gestionada de RDS.

Elastic Beanstalk requiere menos cambios que ECS/Fargate y Lambda/API Gateway. ECS normalmente añade ALB y operación; Lambda exige adaptar Prisma/conexiones; App Runner tiene un costo base poco compatible con USD 5. En dev se mantiene Render/Vercel y se planifican solo servicios variables de bajo uso. El worker Lambda queda deshabilitado hasta probar su bundle Prisma; nunca se desplegará una función vacía que pierda mensajes.

RDS ocupa subredes privadas y acepta 5432 solo desde el security group backend. No existe NAT Gateway. S3 bloquea acceso público, cifra objetos y versiona facturas. HTTPS productivo requerirá Amplify y un endpoint backend con ACM/ALB o TLS gestionado; ese costo requiere decisión explícita.
