# Integración Dátil

## Estado actual

`INVOICE_PROVIDER=mock` es el default en todos los entornos. El proveedor real (`DatilProvider`) está implementado con contrato completo pero bloqueado hasta que se inyecten rutas y mapeos oficiales.

## Arquitectura del adaptador

`DatilProvider` en `backend/src/providers/invoices/DatilProvider.js` implementa:

- `issueInvoice(context)` — emite una factura electrónica
- `getInvoiceStatus(context)` — consulta el estado de una factura
- `getInvoiceDocuments(context)` — descarga XML y PDF
- `issueCreditNote(context)` — emite nota de crédito

Características:
- Cliente HTTP inyectable (no llama endpoints reales en tests)
- Timeout configurable vía `DATIL_TIMEOUT_MS` (default 15 000 ms)
- Validación condicional de configuración antes de cada operación
- Errores sanitizados: URLs redactadas, mensajes truncados a 240 caracteres
- Mapeo separado entre dominio interno y proveedor (inyectado vía `mappers`)
- Rutas inyectadas vía `operations` — ninguna URL inventada en el código
- `cancelInvoice` bloqueado explícitamente hasta documentar el contrato oficial

## Variables de entorno

| Variable | Requerida cuando | Descripción |
|---|---|---|
| `DATIL_BASE_URL` | `INVOICE_PROVIDER=datil` | URL base del API de Dátil |
| `DATIL_API_KEY` | `INVOICE_PROVIDER=datil` | Clave de autenticación |
| `DATIL_ISSUER_RUC` | `INVOICE_PROVIDER=datil` | RUC del emisor |
| `DATIL_TIMEOUT_MS` | Opcional | Timeout HTTP en ms (default 15000) |

## Flujo de facturación

1. Pago aprobado → `PaymentService.confirm()` crea `Invoice` en estado `PENDING` y encola `Job` tipo `ISSUE_INVOICE`.
2. Worker (`jobWorker.js`) reclama el job atómicamente con `lockedAt` y `lockedBy`.
3. `InvoiceService.process()` llama al proveedor configurado.
4. Documentos (XML, PDF) se almacenan vía `StorageService`.
5. Se envía correo de notificación vía `EmailService`.

## Tests contractuales

Los tests en `backend/tests/provider-contracts.test.js` verifican:
- El proveedor nunca llama endpoints reales (cliente HTTP simulado)
- Todas las operaciones funcionan con cliente inyectado
- Operaciones sin rutas/mapeos fallan con `DatilProviderError` descriptivo
- Errores de respuesta HTTP son sanitizados (sin URLs en el mensaje)
- Validación de configuración faltante (`baseUrl`, `apiKey`, `issuerRuc`)

## Campos oficiales pendientes de documentación

Los siguientes campos no están documentados en este repositorio y deben obtenerse de la documentación oficial del sandbox de Dátil antes de activar el proveedor real:

- Rutas exactas de cada operación (path y método HTTP)
- Shape del payload de `issueInvoice` (campos de emisor, receptor, items, impuestos)
- Shape del payload de `issueCreditNote`
- Cabeceras adicionales requeridas más allá de `Authorization` y `X-Datil-Issuer-RUC`
- Códigos de estado y estructura de error de la API
- Mecanismo de idempotencia del proveedor (si existe)
- Formato de `accessKey` y `authorizationNumber` en respuestas

## Activar el proveedor real

```bash
INVOICE_PROVIDER=datil
DATIL_BASE_URL=https://link.datil.co  # URL oficial del sandbox/producción
DATIL_API_KEY=<tu-api-key>
DATIL_ISSUER_RUC=<ruc-del-emisor>
```

Además se deben inyectar `operations` y `mappers` en `getInvoiceProvider.js` con las rutas y transformaciones oficiales.

No activar con credenciales reales sin haber validado el contrato en el sandbox oficial.
