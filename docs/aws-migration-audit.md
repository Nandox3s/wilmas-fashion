# Auditoría para la migración a AWS

Fecha: 2026-07-21. Rama base: `feature/product-management-roles` en `3c23b60`. Rama de trabajo: `feature/aws-migration`.

## Estado actual

El frontend es React 18/Vite 5, conserva un catálogo local y combina datos de la API priorizando precio, descuento, stock e imagen remotos. El carrito persiste en `wf_cart`. Login, registro y las vistas USER/ADMIN usan JWT, pero la autorización visual aún consulta el rol en `localStorage`.

El backend es Express 4 con Prisma 5.6 y SQLite. Toda la aplicación, rutas, acceso a datos, validaciones, uploads y arranque están en `src/index.js`. Los modelos son `User`, `Product` y `Sale`; los importes son `Float` y una venta admite un solo producto. Los archivos se guardan en `backend/uploads`.

Despliegue actual: frontend en Vercel y backend en Render. Ambos se conservarán como rollback durante la migración.

## Contratos y permisos observados

- Públicos: `GET /`, `GET /api/ping`, listado/detalle de productos y `GET /api/stats/overview`.
- Auth: `POST /api/auth/register` fuerza `USER`; `POST /api/auth/login` entrega JWT de 7 días con `userId`, email y rol.
- USER y ADMIN: crear/editar productos, cambiar precio/stock, subir imágenes y crear ventas.
- Solo ADMIN: eliminar productos, listar/modificar/eliminar usuarios, listar ventas y consultar analytics.
- El middleware vuelve a consultar el usuario en base, una propiedad correcta que debe conservarse.

## Problemas encontrados

- No hay PostgreSQL, migraciones versionadas, pedidos multlínea, pagos, facturas ni eventos idempotentes.
- Dinero almacenado como `Float`; riesgo de redondeo y conciliación.
- `Dockerfile` contiene un `DATABASE_URL` SQLite y ejecuta `prisma db push` en cada arranque.
- `GET /api/ping` no comprueba la base; `GET /api/stats/overview` expone datos sin autenticación.
- CORS y límite JSON están configurados en línea; no hay Helmet ni rate limiting.
- Multer confía en MIME declarado y el almacenamiento local no es durable en AWS.
- Las pruebas backend actuales inspeccionan expresiones del fuente y no ejercitan HTTP ni una base aislada.
- No existe cierre por `SIGTERM`; `app` no puede importarse sin abrir un puerto.
- Algunas rutas manejan errores localmente y pueden exponer mensajes internos.
- No hay CI con PostgreSQL ni validación Terraform.

## Compatibilidad y cambios potencialmente incompatibles

PostgreSQL requiere convertir `sizes` a `Json`, `Float` a `Decimal`, normalizar `CUSTOMER` a `USER` y generar migración inicial. Los `Decimal` de Prisma se serializarán como texto/valor normalizado para conservar el contrato numérico del frontend. `Sale` se mantendrá temporalmente para datos históricos. Los endpoints existentes se conservarán mientras se agregan `/api/orders`, `/api/payments`, `/api/invoices` y `/api/uploads`.

## Arquitectura propuesta

La opción inicial es Elastic Beanstalk con instancia única, RDS PostgreSQL privado, S3 privado, Secrets Manager, SQS/DLQ, worker Lambda cuando el empaquetado y conexiones lo permitan, SES y CloudWatch. Minimiza la reescritura de Express/Prisma y soporta webhooks/HTTPS.

- ECS/Fargate añade operación, balanceador y costo base poco apropiados para USD 5.
- Lambda/API Gateway exigiría adaptar Express, gestionar cold starts y conexiones PostgreSQL.
- App Runner reduce operación, pero suele tener un costo base mayor y no evita RDS.
- Elastic Beanstalk sigue siendo costoso junto con RDS; el plan económico debe comparar mantener Render/Vercel y crear solo recursos demostrativos cuando proceda.

## Riesgos y mitigaciones

- Presupuesto: RDS y cómputo pueden superar USD 5; no se aplicará infraestructura sin plan, estimación y aprobación.
- Datos: exportación de SQLite será solo lectura, repetible, con conteos, hashes y rollback verificado.
- Sobreventa: transacción, reserva por pedido y confirmación idempotente.
- Proveedores externos: mock por defecto; PayPhone y Dátil quedan detrás de adaptadores sin inventar contratos.
- Seguridad: secretos fuera de Git, IAM mínimo, RDS privado, S3 Block Public Access, URLs firmadas y logs saneados.

## Estrategia de rollback

Antes de importar se respaldan `prisma/dev.db` y `uploads/`, se verifican hashes y se conservan Render/Vercel. La conmutación será reversible hacia las URLs actuales. PostgreSQL se exportará con `pg_dump`; S3 mantendrá versionado para facturas. No se eliminarán servicios previos hasta validar estabilidad.

## Recursos con costo

RDS, instancia de backend, balanceador si se usa, Secrets Manager, Route 53, NAT Gateway y almacenamiento/tráfico pueden generar cargos. NAT Gateway, Multi-AZ, WAF, ElastiCache, OpenSearch y RDS Proxy quedan fuera del diseño dev predeterminado. S3, SQS, Lambda, SES y CloudWatch son variables y deben limitarse con lifecycle, retención y presupuesto.

## Suposiciones y decisiones pendientes

- Región objetivo `us-east-1`; perfil previsto `wilmas-dev`, actualmente AWS CLI no está en `PATH` aunque existe en `C:\Program Files\Amazon\AWSCLIV2`.
- Terraform no fue localizado en `PATH`; se necesita ubicarlo o instalarlo antes de validar/planificar.
- Pendientes: dominio, correo de presupuesto, credenciales sandbox, remitente SES, elección final del hosting tras el plan y autorización de recursos con costo.
