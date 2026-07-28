# Invoice worker

## Rol
Procesa trabajos `ISSUE_INVOICE` desde PostgreSQL y deja trazabilidad en `Invoice`, `InvoiceEvent` y `Job`.

## Ejecución
```powershell
Set-Location backend
node src/workers/jobWorker.js
```

## Modo de una sola pasada
```powershell
$env:WORKER_RUN_ONCE='1'
Set-Location backend
node src/workers/jobWorker.js
```

## Reglas operativas
- Usa bloqueo con `lockedAt` y `lockedBy`.
- Reintenta con backoff exponencial y jitter.
- Falla de forma terminal cuando se agota el máximo de intentos.
- No debe dejarse corriendo al terminar pruebas locales.

## Scripts de soporte
- `npm run dev:show-jobs`
- `npm run dev:list-invoices`
- `npm run dev:enqueue-invoice-job`
