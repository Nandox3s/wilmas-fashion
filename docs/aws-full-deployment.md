# AWS full: despliegue, migración y rollback

Este runbook prepara operaciones; no autoriza `terraform apply`, migraciones RDS, despliegues, DNS, pagos ni facturas legales.

## Arquitectura

```text
GitHub feature/aws-migration
  └─ Amplify Hosting (React/Vite, HTTPS administrado)
       └─ CloudFront HTTPS temporal del API
            └─ Elastic Beanstalk single-instance / EC2 en subred pública
                 ├─ RDS PostgreSQL Single-AZ en subredes privadas
                 ├─ S3 products privado
                 ├─ S3 invoices privado y versionado
                 ├─ Secrets Manager (RDS administrado + secreto app sin valor Terraform)
                 └─ CloudWatch Logs y alarmas

SQS + DLQ → Lambda invoice worker (desactivados hasta publicar imagen Linux probada)
SES identity (desactivada hasta verificar remitente)
```

La instancia EB obtiene IP pública y salida a Internet mediante la subred pública y el Internet Gateway. Accede a RDS por direccionamiento privado dentro de la VPC; RDS no necesita Internet ni NAT. EB necesita salida para AWS APIs y proveedores futuros. RDS permanece sin ruta pública. El worker está desactivado hasta publicar una imagen Linux reproducible y decidir su acceso PostgreSQL sin introducir NAT.

## Terraform y secretos

Tras revisar y aprobar un plan guardado, la primera fase crea Amplify desconectado de GitHub y devuelve `amplify_branch_url`. Antes de desplegar el backend se debe poblar `wilmas/prod/application` desde la consola con JSON que contenga como mínimo `JWT_SECRET`; claves futuras admitidas: `PAYPHONE_TOKEN`, `PAYPHONE_STORE_ID`, `DATIL_API_KEY` y `SES_FROM_EMAIL`. PayPhone y Dátil permanecen mock.

RDS genera la contraseña con `manage_master_user_password`. Terraform conserva ARN y metadata en state, no la contraseña. El secreto de aplicación no tiene `aws_secretsmanager_secret_version`, evitando que valores entren al state. El state remoto productivo debe cifrarse, bloquearse, versionarse y tener acceso mínimo.

## Amplify en dos fases

1. Crear la app y autorizar GitHub manualmente; seleccionar `feature/aws-migration` sin copiar tokens a Terraform.
2. Leer `amplify_branch_url`.
3. Asignar esa URL explícita a `amplify_origin` en configuración local.
4. Generar un segundo plan: solo debe actualizar CORS de S3 y EB.
5. Aplicarlo únicamente con nueva aprobación.

Amplify recibe `VITE_API_BASE` desde CloudFront y mantiene checkout, payment e invoice en `mock`.

## Backend

1. Ejecutar `backend/scripts/deployment/build-artifact.ps1`.
2. Verificar que el ZIP no contenga `.env`, uploads, backups, exports, tests ni `node_modules`.
3. EB usa la plataforma vigente Node.js 22 AL2023 y ejecuta `.platform/hooks/prebuild/01_dependencies.sh`: `npm ci --omit=dev` y `prisma generate`.
4. Publicar con EB CLI o `create-application-version`; no usar claves permanentes.
5. `Procfile` ejecuta `web: npm start`; la aplicación escucha `PORT=8080`.
6. Verificar CloudFront `/api/ping`.
7. No ejecutar migraciones en hooks de reinicio o despliegue.

## Migración RDS controlada

1. Crear y verificar backups SQLite/uploads.
2. Confirmar export validado: 1 usuario, 6 productos, 0 ventas.
3. Abrir túnel SSM desde puerto local 55432 a RDS usando la EC2 del entorno y `AWS-StartPortForwardingSessionToRemoteHost`. No abrir 5432 públicamente.
4. Establecer `RDS_SECRET_ARN`, `DATABASE_NAME`, `MIGRATION_EXPORT`, `AWS_PROFILE`, `AWS_REGION`, `RDS_TUNNEL_PORT=55432` y `CONFIRM_RDS_MIGRATION=yes`.
5. Ejecutar `node scripts/migration/migrate-rds-through-tunnel.js`. Obtiene credenciales en memoria, ejecuta `prisma migrate deploy`, importa y valida sin imprimir contraseña ni URL.
6. Verificar conteos, emails, roles, SKU, stock, Decimal, descuentos, hashes bcrypt y claves foráneas; después probar login y catálogo por HTTPS.

## Imágenes

1. Ejecutar `migrate-uploads-s3.js` sin confirmación para dry-run.
2. Revisar firmas, tamaños, rechazados y manifest.
3. Con aprobación, establecer `CONFIRM_UPLOAD_MIGRATION=yes` y repetir.
4. Ejecutar `validate-s3-uploads.js`.
5. Ejecutar `reconcile-product-images.js` en dry-run y luego con `CONFIRM_IMAGE_RECONCILIATION=yes`.
6. El backend convierte claves `products/` en URLs firmadas. Invoices requieren autorización y nunca se sirven estáticamente.

## Smoke tests y rollback

Comprobar healthcheck, login, permisos, seis productos, imágenes, pedido multilínea, importes, stock, pago/invoice mock, idempotencia y logs saneados. Vercel y Render permanecen activos. Ante fallo, detener despliegues AWS, mantener RDS/S3 para diagnóstico, volver a las URLs anteriores y restaurar SQLite/uploads. DNS solo cambia tras estabilidad y otra aprobación.
