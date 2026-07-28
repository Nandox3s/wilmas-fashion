# Revisión de migración — 20260726000100

Referencia: `backend/prisma/migrations/20260726000100_add_shipping_jobs_and_extended_statuses/migration.sql`
Schema actual: `backend/prisma/schema.prisma`

---

## Tablas creadas

| Tabla | Columnas clave | Restricciones |
|---|---|---|
| `Job` | `id`, `type`, `aggregateId`, `payload JSONB`, `status JobStatus`, `attempts`, `nextAttemptAt`, `lastError`, `lockedAt`, `lockedBy` (migración 20260727000001), `processedAt`, `createdAt` | PK `id`; índice `Job_status_nextAttemptAt_idx` |
| `Shipment` | `id`, `orderId`, `provider`, `carrierName`, `trackingNumber`, `trackingUrl`, `status ShippingStatus`, `shippingCost DECIMAL(12,2)`, `estimatedDelivery`, `shippedAt`, `deliveredAt`, `notes`, `createdAt`, `updatedAt` | PK `id`; UNIQUE `orderId`; FK → `Order(id) CASCADE` |
| `ShipmentEvent` | `id`, `shipmentId`, `status ShippingStatus`, `description`, `location`, `occurredAt`, `createdAt` | PK `id`; FK → `Shipment(id) CASCADE` |
| `Notification` | `id`, `type`, `recipient`, `status`, `provider`, `attempts`, `sentAt`, `lastError`, `orderId`, `createdAt` | PK `id`; FK → `Order(id) SET NULL` |
| `BillingProfile` | `id`, `userId`, `identificationType`, `identificationNumber`, `legalName`, `billingEmail`, `phone`, `billingAddress`, `isDefault`, `createdAt`, `updatedAt` | PK `id`; FK → `User(id) CASCADE` |

---

## Columnas agregadas a tablas existentes

### `Payment`
- `externalTransactionId TEXT` — UNIQUE index `Payment_externalTransactionId_key`
- `authorizationCode TEXT`
- `cardBrand TEXT`
- `cardLastDigits TEXT`
- `failureCode TEXT`
- `failureMessage TEXT`
- `confirmedAt TIMESTAMP(3)`
- `reversedAt TIMESTAMP(3)`
- `refundedAt TIMESTAMP(3)`

### `Invoice`
- `externalId TEXT` — UNIQUE index `Invoice_externalId_key`
- `establishment TEXT`
- `emissionPoint TEXT`
- `sequential TEXT`
- `pdfLocation TEXT`
- `xmlLocation TEXT`
- `rejectionReason TEXT`
- `retryCount INTEGER NOT NULL DEFAULT 0`

### `User`
- `updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP` — solo si no existía (bloque DO $$)

---

## Enums modificados

### `OrderStatus` — valores añadidos con `ADD VALUE IF NOT EXISTS`
`CREATED`, `INVOICING`, `INVOICE_AUTHORIZED`, `PREPARING`, `READY_TO_SHIP`, `SHIPPED`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`, `REFUND_PENDING`, `RETURN_REQUESTED`, `RETURNED`

> Los valores `INVOICE_PENDING`, `INVOICED`, `PAYMENT_FAILED`, `CANCELLED`, `REFUNDED`, `EXPIRED` ya existían en la migración inicial (`20260721203000_init_postgresql`).

### `PaymentStatus` — valores añadidos
`CREATED`, `REVERSED`

### `InvoiceStatus` — valores añadidos
`FAILED`, `CREDIT_NOTE_ISSUED`

### Enums nuevos
- `JobStatus`: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`
- `ShippingStatus`: `PENDING`, `READY_FOR_PICKUP`, `PICKED_UP`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`, `DELIVERY_FAILED`, `RETURNED`, `CANCELLED`

---

## Índices creados

| Índice | Tabla | Tipo |
|---|---|---|
| `Shipment_orderId_key` | `Shipment` | UNIQUE |
| `Payment_clientTransactionId_key` | `Payment` | UNIQUE |
| `Payment_externalTransactionId_key` | `Payment` | UNIQUE |
| `Invoice_externalId_key` | `Invoice` | UNIQUE |
| `Invoice_accessKey_key` | `Invoice` | UNIQUE |
| `Job_status_nextAttemptAt_idx` | `Job` | Compuesto (status, nextAttemptAt) |

---

## Migración adicional: 20260727000001_add_job_locked_by

Agrega `lockedBy TEXT` a `Job`. El worker ya referenciaba este campo; sin esta migración el campo no persiste en PostgreSQL.

```sql
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "lockedBy" TEXT;
```

---

## Impacto sobre datos existentes

- `ADD VALUE IF NOT EXISTS` en enums PostgreSQL es seguro y no requiere bloqueo de tabla.
- Las columnas nuevas en `Payment` e `Invoice` son todas `TEXT` o `TIMESTAMP` nullable, sin valor por defecto obligatorio — no afectan filas existentes.
- `retryCount INTEGER NOT NULL DEFAULT 0` en `Invoice` asigna 0 a filas existentes automáticamente.
- `User.updatedAt` usa `DEFAULT CURRENT_TIMESTAMP` y solo se agrega si no existe.

---

## Riesgo de valores incompatibles

- Si la base de producción tiene filas en `Order` con valores de `status` que no existen en el enum extendido, la migración fallará al intentar leer esas filas con Prisma. Auditar con:
  ```sql
  SELECT DISTINCT status FROM "Order";
  ```
- Si `Payment.clientTransactionId` tiene duplicados en producción, el índice UNIQUE fallará. Auditar con:
  ```sql
  SELECT "clientTransactionId", COUNT(*) FROM "Payment" GROUP BY 1 HAVING COUNT(*) > 1;
  ```

---

## Estrategia de respaldo

1. Crear snapshot de la base antes de aplicar: `pg_dump -Fc wilmas_fashion > backup-pre-migration.dump`
2. Verificar integridad del dump antes de continuar.
3. Aplicar en base desechable local primero: `npx prisma migrate deploy` con `DATABASE_URL` apuntando a una copia.
4. Ejecutar suite completa de tests: `npm test`.
5. Solo si todo pasa, aplicar en staging y luego en producción.

---

## Rollback lógico

PostgreSQL no permite eliminar valores de un enum una vez creados. El rollback lógico consiste en:

1. Restaurar el dump previo a la migración.
2. Revertir el código a la versión anterior (sin las nuevas tablas ni columnas).
3. Las tablas nuevas (`Job`, `Shipment`, `ShipmentEvent`, `Notification`, `BillingProfile`) pueden eliminarse con `DROP TABLE IF EXISTS` en orden inverso de dependencias.
4. Las columnas añadidas a `Payment` e `Invoice` pueden eliminarse con `ALTER TABLE ... DROP COLUMN`.

No existe rollback automático de `ADD VALUE` en enums — requiere restaurar desde backup.

---

## Prueba en base local desechable

```powershell
# Crear base de prueba
docker exec -it wilmas-postgres psql -U wilmas -c "CREATE DATABASE wilmas_migration_test;"

# Aplicar migración
$env:DATABASE_URL="postgresql://wilmas:change-me@localhost:5432/wilmas_migration_test?schema=public"
npx prisma migrate deploy

# Verificar
npx prisma validate
npm test

# Limpiar
docker exec -it wilmas-postgres psql -U wilmas -c "DROP DATABASE wilmas_migration_test;"
```
