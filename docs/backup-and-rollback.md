# Respaldo y rollback

## Respaldo local

El script no modifica el SQLite original. Desde `backend/`:

```powershell
node scripts/backup/create-backup.js
node scripts/backup/verify-backup.js backups/<backup-directory>
```

Cada respaldo contiene una copia de `prisma/dev.db`, `uploads/` si existe y un manifiesto SHA-256. `backend/backups/` está ignorado salvo `.gitkeep`.

## Restauración segura

Restaurar siempre a rutas nuevas, validar la aplicación y solo después efectuar una conmutación manual:

```powershell
$env:CONFIRM_RESTORE='yes'
$env:RESTORE_DB='C:\restore\dev.db'
$env:RESTORE_UPLOADS='C:\restore\uploads'
node scripts/backup/verify-backup.js backups/<backup-directory> restore
```

El script se niega a sobrescribir destinos existentes. No se debe usar mientras haya escrituras activas.

## Rollback de aplicación

1. Detener nuevas escrituras o activar mantenimiento.
2. Reorientar el frontend a la URL de Render y conservar Vercel como frontend estable.
3. Verificar `/api/ping`, login, catálogo y una consulta no destructiva.
4. Restaurar SQLite/uploads desde una copia verificada si la fuente local fue afectada.

## PostgreSQL y S3

Antes de cambios productivos crear un `pg_dump` cifrado fuera de Git y verificarlo con `pg_restore --list`. Restaurar en una base nueva y comparar usuarios, SKU, stock y totales antes de conmutar. Para S3 usar versionado del bucket privado; recuperar una versión concreta de cada objeto sin volverlo público.

No se eliminarán Render, Vercel, SQLite ni uploads anteriores durante el período de estabilización.
