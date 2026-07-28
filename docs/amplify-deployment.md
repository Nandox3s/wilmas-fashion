# Amplify Hosting

`amplify.yml` ejecuta `npm ci`, tests y build desde `frontend/`, publica `dist` y cachea dependencias. Conectar `feature/aws-migration`, definir `VITE_API_BASE`/`VITE_CHECKOUT_MODE` y agregar rewrite SPA `/<*> -> /index.html (200)`. La autorización de GitHub es manual. Vercel se conserva para rollback.
