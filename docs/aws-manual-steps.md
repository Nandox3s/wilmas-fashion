# Pasos manuales AWS

1. Ejecutar `aws sso login --profile wilmas-dev` si expira SSO; nunca crear access keys permanentes.
2. Crear credenciales sandbox PayPhone y Dátil, remitente SES y secretos mediante consola/CLI sin copiarlos a Git.
3. Autorizar GitHub en Amplify y conectar primero `feature/aws-migration`.
4. Configurar `VITE_API_BASE` y `VITE_CHECKOUT_MODE`; agregar rewrite SPA `/<*>` a `/index.html` con 200.
5. Tras aprobar infraestructura, configurar GitHub OIDC y environment `production` con aprobación.
6. Verificar presupuesto y alarmas. Dominio, certificados y DNS esperan una segunda decisión.

Placeholders: `<AWS_REGION>`, `<AWS_ACCOUNT_ID>`, `<DOMAIN>`, `<BUDGET_EMAIL>`, `<PAYPHONE_TOKEN>`, `<PAYPHONE_STORE_ID>`, `<DATIL_API_KEY>`, `<SES_FROM_EMAIL>`.
