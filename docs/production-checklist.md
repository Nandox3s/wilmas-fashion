# Production checklist

## Previo
- Variables configuradas sin secretos en Git.
- Migraciones aplicadas en entorno objetivo.
- `PAYMENT_PROVIDER=mock` y `INVOICE_PROVIDER=mock` en staging.
- `PAYPHONE_MOCK_SERVER_ENABLED=false` en producción.
- `VITE_CHECKOUT_MODE=production` en producción.

## Validacion tecnica
- `npx prisma validate`
- `npm test`
- `npm run build` frontend
- `npm run worker` en entorno controlado
- Verificar que `/mock-payphone/checkout` no aparezca en producción.

## Diagrama de flujo
```mermaid
flowchart LR
  A[Cliente] --> B[Checkout]
  B --> C[PayPhone]
  C --> D[Confirmacion backend]
  D --> E[PostgreSQL]
  E --> F[Trabajo de factura]
  F --> G[Datil]
  G --> H[SRI]
  H --> I[PDF/XML]
  I --> J[Correo]
  J --> K[Envio manual]
  K --> L[Tracking]
  L --> M[Entrega]
```
