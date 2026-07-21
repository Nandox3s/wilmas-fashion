# Despliegue de Wilmas Fashion

## Estado

Render y Vercel siguen activos como rollback. AWS está preparado como código pero no aplicado. El plan dev reducido excluye RDS/Elastic Beanstalk porque exceden el presupuesto mensual de USD 5. No desplegar pagos/invoices reales: mock es el default.

## Backend

Node 20 arranca con `npm start`; `app.js` no abre puerto y `server.js` maneja SIGINT/SIGTERM. Ejecutar `npm run migrate:deploy` una sola vez como paso separado. Variables provienen de Secrets Manager/entorno; no ejecutar `db push` ni seed. Validar `/api/ping` y logs antes de tráfico.

Elastic Beanstalk está parametrizado en Terraform y deshabilitado en dev. SingleInstance reduce costo, pero HTTPS productivo requiere una decisión adicional documentada en `docs/backend-deployment.md` y `docs/domain-and-https.md`.

## Frontend

`amplify.yml` prueba y compila `frontend/dist`. Conectar manualmente `feature/aws-migration`, configurar `VITE_API_BASE`/`VITE_CHECKOUT_MODE` y rewrite SPA. No desconectar Vercel durante estabilización.

## Secuencia segura

1. Leer `docs/backup-and-rollback.md` y crear/verificar respaldo.
2. Validar Docker/PostgreSQL y ejecutar pruebas completas.
3. Revisar `terraform plan`, costo y cero destrucciones.
4. Obtener aprobación explícita antes de `terraform apply`.
5. Obtener segunda aprobación antes de migración productiva/DNS.
6. Seguir `docs/production-cutover.md` y mantener Render/Vercel.

Si GitHub Actions no inicia por facturación, distinguir job no iniciado de código fallido. No usar access keys permanentes; despliegue futuro usará GitHub OIDC y environment `production` con aprobación.
