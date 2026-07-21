# Migración SQLite a PostgreSQL

La exportación abre SQLite en modo de solo lectura, conserva hashes bcrypt sin imprimirlos y escribe el artefacto en `backend/migration-exports/`, excluido de Git.

```powershell
cd backend
node scripts/migration/export-sqlite-data.js
node scripts/migration/validate-export.js
$env:DATABASE_URL='<POSTGRESQL_TEST_URL>'
npx prisma migrate deploy
node scripts/migration/import-postgresql-data.js
node scripts/migration/validate-import.js
```

Los imports usan `upsert`, normalizan `CUSTOMER` a `USER`, convierten importes a dos decimales y generan un reporte por fila sin contraseñas ni hashes. Antes de producción: respaldo verificado, ventana solo lectura, URL confirmada, `pg_dump`, aprobación explícita y comparación manual de usuarios, correos, SKU, stock, ventas y totales. Nunca usar `db push` en producción.

Docker local está definido en `docker-compose.postgres.yml`. En la auditoría de 2026-07-21 Docker Desktop no estaba iniciado, por lo que la migración SQL se generó mediante `prisma migrate diff` y no se ejecutó contra PostgreSQL.
