# Wilmas Fashion en AWS

Estado verificado: 23 de agosto de 2026. Este documento describe el despliegue activo; no autoriza `terraform apply` ni operaciones destructivas.

## Arquitectura

```text
Internet
  -> DuckDNS: wilmasfashion.duckdns.org
  -> IP estática Lightsail: 98.86.209.183
  -> firewall Lightsail + UFW (80/443 públicos; 22 desde IP administrativa)
  -> Ubuntu 24.04 / Lightsail small_3_0
     -> Nginx + Let's Encrypt
        -> /, /catalog, /admin, /img_wf -> React/Vite estático
        -> /api -> Node/Express en 127.0.0.1:4000
     -> PostgreSQL 16 en 127.0.0.1:5432
```

La instancia productiva es `wilmas-fashion-prod-recovery-clean`. La IP `wilmas-fashion-prod-ipv4` está asociada a ella. PostgreSQL no es público y no se creó RDS: se conservó el perfil Lightsail ya existente para evitar una segunda arquitectura y costos adicionales.

## Estado de datos y aplicación

- Base activa: `wilmas_fashion_restore_20260823`.
- Productos: 36 totales, 17 activos y 19 archivados.
- Imágenes: 17/17 presentes bajo `/img_wf/` y verificadas con HTTP 200.
- Datos conservados: 20 usuarios, 1 ADMIN, 20 pedidos y 15 facturas.
- `UserAuthProvider`: tabla y migración presentes; la fuente tenía 0 vínculos creados.
- Prisma: cinco migraciones aplicadas; `prisma migrate deploy` informó que no había migraciones pendientes.

## Servicios y rutas

- Producción: `https://wilmasfashion.duckdns.org/`
- Catálogo: `https://wilmasfashion.duckdns.org/catalog`
- Admin: `https://wilmasfashion.duckdns.org/admin`
- Health: `https://wilmasfashion.duckdns.org/api/ping`
- Productos: `https://wilmasfashion.duckdns.org/api/products?limit=100`
- systemd: `wilmas-backend`, `wilmas-backup.timer`, `certbot.timer`.
- Nginx redirige HTTP a HTTPS. Node y PostgreSQL escuchan solo en loopback.

## Código, artefacto y despliegue

El artefacto se genera con `scripts/build-lightsail-artifact.ps1`. Usa una allowlist, incluye archivos actuales rastreados y no rastreados que no estén ignorados, y rechaza `.env`, backups, tests, claves, estados Terraform y bases locales.

```powershell
cd frontend
npm ci
npm test
npm run build -- --mode lightsail
cd ..
powershell -NoProfile -File scripts/build-lightsail-artifact.ps1 -OutputPath artifacts/NOMBRE-UNICO.tar.gz
```

En el servidor, validar SHA-256, extraer en `/home/ubuntu/wilmas-release`, ejecutar `ops/lightsail/provision-base.sh`, instalar el backend con `npm ci --omit=dev`, generar Prisma y copiar a `/opt/wilmas-fashion`. Las migraciones productivas se ejecutan exclusivamente mediante `wilmas-migrate.service`, que usa `prisma migrate deploy`.

Nunca usar en producción `prisma migrate dev`, `prisma migrate reset`, `prisma db push --force-reset`, `DROP DATABASE` ni el seed sin su confirmación explícita.

## Variables y secretos

El archivo real es `/etc/wilmas-fashion/backend.env`, propietario `root:wilmas`, modo `0640`; no pertenece al repositorio. Contiene `DATABASE_URL`, `JWT_SECRET`, orígenes, proveedores y callbacks. Los ejemplos seguros están en `backend/.env.example` y `frontend/.env.example`.

Pendientes para proveedores reales:

- `GOOGLE_CLIENT_ID` y `VITE_GOOGLE_CLIENT_ID` deben contener el mismo Web Client ID.
- `FACEBOOK_APP_ID`, `VITE_FACEBOOK_APP_ID` y solo en backend `FACEBOOK_APP_SECRET`.
- `PAYPHONE_TOKEN` y `PAYPHONE_STORE_ID`; cambiar `PAYMENT_PROVIDER` únicamente después de pruebas del proveedor.
- Dátil/SRI, SES o S3 permanecen desactivados mientras no existan credenciales reales.

Para una siguiente fase, mover secretos a SSM Parameter Store o Secrets Manager sin escribirlos en Terraform ni Git.

## Backups y restore

Backup local fuente validado:

```text
backend/backups/postgresql-2026-08-23T18-21-00Z/wilmas_fashion.dump
SHA-256: 6cb8b63545d138e1ac831caa8f5fb6d0112aec821c071f6b8a49146eca15f1ae
PostgreSQL origen: 16.14; formato custom
```

Backup AWS previo al corte: `/opt/wilmas-fashion/backups/postgresql-20260823T193351Z.dump` (el script selecciona la base indicada por `backend.env`). El timer corre diariamente a las 05:15 UTC. Lightsail toma snapshot automático a las 06:00 UTC. También existe `wilmas-precutover-clean-20260823-1933`.

Restaurar siempre en una base nueva:

```bash
sudo wilmas-restore-postgresql DUMP wilmas_fashion_restore_REVISION DUMP.sha256
```

El restore rechaza una base existente y nunca sobrescribe la activa.

## Rollback

Si falla la versión nueva:

1. detener escrituras y crear un último `pg_dump` de la base activa;
2. reasociar `wilmas-fashion-prod-ipv4` a `wilmas-fashion-prod-v2`;
3. comprobar asociación y `https://wilmasfashion.duckdns.org/api/ping`;
4. conservar la instancia nueva, sus backups y snapshots para diagnóstico.

```powershell
aws lightsail attach-static-ip --static-ip-name wilmas-fashion-prod-ipv4 --instance-name wilmas-fashion-prod-v2 --region us-east-1
```

No usar `terraform destroy` como rollback. La instancia anterior no fue eliminada.

## Dominio y HTTPS

DuckDNS resuelve `wilmasfashion.duckdns.org` a `98.86.209.183`. Let's Encrypt emitió el certificado y `certbot renew --dry-run` pasó. La renovación automática está activa. Conviene registrar posteriormente un correo real en la cuenta de Certbot para recibir avisos.

## Google

En Google Cloud, para la credencial OAuth Web existente, agregar exactamente:

```text
Authorized JavaScript origin: https://wilmasfashion.duckdns.org
```

El flujo actual intercambia el token de Google en Express y devuelve el JWT propio de Wilmas Fashion; no usa Cognito.

## Facebook

En Meta for Developers configurar:

- App Domain: `wilmasfashion.duckdns.org`;
- Site URL: `https://wilmasfashion.duckdns.org/`;
- dominio permitido del JavaScript SDK: `wilmasfashion.duckdns.org`;
- política de privacidad HTTPS y modo Live cuando Meta complete la revisión;
- si Meta exige una URI OAuth explícita para la configuración elegida, usar la ruta real mostrada por el SDK, sin inventar una ruta backend.

El App Secret permanece únicamente en backend.

## PayPhone

Configurar en PayPhone:

```text
Response URL: https://wilmasfashion.duckdns.org/pago/resultado
Allowed domain: https://wilmasfashion.duckdns.org
Cancellation URL: https://wilmasfashion.duckdns.org/checkout
```

PayPhone continúa pendiente hasta cargar credenciales reales y ejecutar una transacción de sandbox. No se habilitó un pago real durante el despliegue.

## Terraform e infraestructura histórica

El root relevante es `infra/terraform/environments/aws-full-budget-lightsail`. Su estado local todavía describe `wilmas-fashion-prod`, no la instancia productiva actual; existe drift y no debe ejecutarse `apply` hasta importar/reconciliar recursos en una sesión separada. `terraform validate` pasó; `plan` no pudo autenticarse con las credenciales de sesión de AWS CLI. No se ejecutó `apply` ni `destroy`.

## Diagnóstico

```bash
sudo systemctl status wilmas-backend nginx postgresql --no-pager
sudo journalctl -u wilmas-backend --no-pager -n 100
sudo nginx -t
sudo sshd -t
sudo ufw status verbose
sudo ss -ltnp
sudo certbot renew --dry-run
```

Los únicos listeners públicos esperados son 22, 80 y 443; 22 está restringido por Lightsail y UFW. Puertos 4000 y 5432 deben permanecer en `127.0.0.1`.
