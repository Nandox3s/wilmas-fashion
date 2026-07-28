# AWS full budget: Lightsail

Este perfil sustituye **como opción recomendada** al diseño administrado `aws-full` para el alcance universitario y de bajo tráfico. Es independiente: no importa el estado, los módulos ni los `tfvars` de Elastic Beanstalk, RDS o Amplify. En esta preparación no se ejecutan `apply`, despliegues, migraciones reales, cambios DNS ni servicios de pago.

## Arquitectura final

```text
Internet
  ├─ TCP 22 desde CIDR administrador ─┐
  └─ TCP 80/443 público ──────────────┤
                              Lightsail firewall
                                      │
                                     UFW
                                      │
               ┌──────────────────────┴──────────────────────┐
               │ Ubuntu 24.04 / small_3_0 / IP estática      │
               │ Nginx ── React/Vite                         │
               │   └─ /api y /uploads ── Node 127.0.0.1:4000 │
               │                              │               │
               │                 PostgreSQL 127.0.0.1:5432    │
               │                 uploads privados/locales     │
               │                 pg_dump + uploads, 7 días    │
               └──────────────────────┬───────────────────────┘
                                      │
                         snapshot Lightsail diario opcional
```

Terraform crea cuatro recursos y ningún servicio administrado adicional:

1. `aws_lightsail_instance.app`;
2. `aws_lightsail_static_ip.app`;
3. `aws_lightsail_static_ip_attachment.app`;
4. `aws_lightsail_instance_public_ports.app`.

El snapshot automático es un bloque `add_on` de la instancia. El firewall de Lightsail es autoritativo: como solo declara 22, 80 y 443, no publica 4000 ni 5432. UFW, Nginx, Node y PostgreSQL repiten esas restricciones dentro del host.

## Capacidad y costo

Valores consultados el 21 de julio de 2026:

| Opción | RAM | vCPU | SSD | Transferencia | Precio base |
|---|---:|---:|---:|---:|---:|
| `small_3_0` recomendada | 2 GB | 2 | 60 GB | 3 TB/mes | USD 12/mes |
| `micro_3_0` solo demo | 1 GB | 2 | 40 GB | 2 TB/mes | USD 7/mes |

La IP estática no tiene costo mientras permanezca asociada. Desasociada por más de una hora cuesta USD 0.005/h. Los snapshots cuestan USD 0.05 por GB-mes realmente almacenado y Lightsail conserva los siete automáticos más recientes. Una ocupación inicial de 10-20 GB suele añadir aproximadamente USD 0.50-1.00/mes; 60 GB completamente usados parten de unos USD 3/mes, más los bloques modificados. El rango razonable es **USD 12.50-15/mes**, sin dominio, impuestos ni exceso de transferencia.

Fuentes oficiales: [precios de Lightsail](https://aws.amazon.com/lightsail/pricing/), [IDs y capacidad de bundles](https://docs.aws.amazon.com/cli/latest/reference/lightsail/get-bundles.html), [snapshots](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-faq-snapshots.html) y [facturación de IP estática](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-frequently-asked-questions-faq-billing-and-account-management.html).

El bundle recomendado es burstable y tiene un baseline del 20 % por vCPU; el de 1 GB tiene 10 %. No equivale a dos núcleos dedicados. Con 2 GB se espera aproximadamente 200-350 MB para sistema/Nginx, 250-500 MB para PostgreSQL y 150-400 MB para Node con tráfico pequeño; el resto queda para caché y picos. El script agrega 1 GB de swap como protección ante picos, no como sustituto de RAM. El build de Vite debe ser secuencial y el plan de 1 GB puede agotar memoria. Véase [rendimiento CPU de Lightsail](https://docs.aws.amazon.com/lightsail/latest/userguide/baseline-cpu-performance.html).

Limitaciones deliberadas:

- Nginx, Node, PostgreSQL y uploads comparten máquina y disco: existe un único punto de falla.
- No hay autoescalado, réplica, failover automático ni aislamiento de base de datos.
- Mantenimiento del sistema operativo, PostgreSQL y Node queda a cargo del operador.
- Los backups locales no cubren pérdida completa del servidor; el snapshot añade esa capa, pero es crash-consistent.
- Un restore de Lightsail solo puede usar un bundle igual o mayor; no permite reducir tamaño.

## 1. Preflight y plan Terraform

El directorio correcto es exclusivamente `infra/terraform/environments/aws-full-budget-lightsail`. No use los `tfvars` de `aws-full` ni de `aws-minimal-hybrid`.

Comprobaciones de solo lectura recomendadas antes de un futuro `apply`:

```powershell
aws lightsail get-regions --include-availability-zones --region us-east-1
aws lightsail get-bundles --region us-east-1 --query "bundles[?bundleId=='small_3_0' || bundleId=='micro_3_0']"
aws lightsail get-blueprints --region us-east-1 --query "blueprints[?blueprintId=='ubuntu_24_04' && isActive==`true`]"
```

Plan:

```powershell
Set-Location infra/terraform/environments/aws-full-budget-lightsail
Copy-Item terraform.tfvars.example terraform.tfvars
# Reemplace REPLACE_WITH_PUBLIC_IPV4/32 con la IPv4 pública real del administrador /32.
# Terraform rechaza valores vacíos, 0.0.0.0/0 y redes TEST-NET.
terraform fmt -recursive
terraform init
terraform validate
terraform plan -var-file=terraform.tfvars
```

Aceptar únicamente `4 to add, 0 to change, 0 to destroy`. El `terraform.tfvars` real no se confirma en Git. La hora de snapshot `06:00` es UTC y ocurre después del backup local de las 05:15 UTC. Este runbook se detiene aquí hasta recibir autorización separada para `terraform apply`.

## 2. Acceso y transferencia futura

Después de un `apply` autorizado en otra sesión, descargar la clave privada regional de Lightsail, protegerla localmente y usar el output `ssh_command_example`. Mantener la clave fuera de Git. Para transferir exactamente los archivos confirmados sin hacer `push`:

```powershell
Set-Location frontend
npm ci
npm test
npm run build -- --mode lightsail
Set-Location ..
powershell -NoProfile -File scripts/build-lightsail-artifact.ps1
scp -i C:\ruta\LightsailDefaultKey-us-east-1.pem `
  artifacts/wilmas-fashion-lightsail.tar.gz `
  artifacts/wilmas-fashion-lightsail.tar.gz.sha256 `
  ubuntu@IP_ESTATICA:/home/ubuntu/
```

El builder usa una allowlist: backend runtime, schema y migraciones Prisma, scripts de importación necesarios, `frontend/dist` y `ops/lightsail`. Falla si encuentra tests, `node_modules`, `.git`, `.env`, exports, SQLite, estados/planes Terraform, claves o rutas sensibles. Produce además un manifiesto local auditable.

En la instancia:

```bash
cd /home/ubuntu
sha256sum --check wilmas-fashion-lightsail.tar.gz.sha256
if tar -tzf wilmas-fashion-lightsail.tar.gz | grep -E '(^/|(^|/)\.\.(/|$))'; then
  echo 'El artefacto contiene una ruta insegura.' >&2
  exit 1
fi
mkdir -p /home/ubuntu/wilmas-release
tar -xzf /home/ubuntu/wilmas-fashion-lightsail.tar.gz -C /home/ubuntu/wilmas-release
cd /home/ubuntu/wilmas-release
sudo SSH_ALLOWED_CIDRS='IP_ADMIN/32' DOMAIN_NAME='_' bash ops/lightsail/provision-base.sh
sudo bash ops/lightsail/configure-database.sh
```

`provision-base.sh` es idempotente, no inicia el backend ni el timer de backups y no emite certificados. Instala Node 22, PostgreSQL 16, Nginx, Certbot, UFW, un usuario `wilmas` sin shell, systemd, logrotate y los directorios requeridos. Endurece SSH sin abrirlo globalmente. `configure-database.sh` genera una contraseña aleatoria, la aplica al rol local y escribe `DATABASE_URL` con propietario `root`, grupo `wilmas` y modo `0640`; nunca muestra el secreto y no lo rota en una segunda ejecución válida.

La instancia es dedicada: cada ejecución reconstruye el ruleset UFW y conserva únicamente SSH desde los CIDR indicados, HTTP y HTTPS. Esto elimina reglas UFW agregadas manualmente; durante la convergencia sigue vigente el firewall de Lightsail con la misma política.

Mientras el dominio permanezca vacío, Nginx sirve temporalmente la tienda y `/api` por HTTP en la IP estática. No introducir credenciales ni datos sensibles a través de Internet hasta activar TLS. `enable-https.sh` exige que el DNS resuelva exactamente a la IP esperada y entonces sustituye el vhost por HTTPS con redirección desde HTTP.

## 3. Configurar secretos

Completar mediante `sudoedit /etc/wilmas-fashion/backend.env`. `DATABASE_URL` ya fue creada por el script. Generar `JWT_SECRET` fuera del historial de comandos y pegarlo en el editor. El archivo debe usar este contrato, con valores reales solo en el servidor:

```dotenv
DATABASE_URL="valor-generado-en-el-servidor"
JWT_SECRET="valor-aleatorio-de-al-menos-32-caracteres"
NODE_ENV=production
HOST=127.0.0.1
PORT=4000
TRUST_PROXY=1
CORS_ORIGINS="http://IP_ESTATICA"
UPLOADS_DIR=/opt/wilmas-fashion/uploads
STORAGE_PROVIDER=local
CHECKOUT_MODE=mock
PAYMENT_PROVIDER=mock
INVOICE_PROVIDER=mock
EMAIL_PROVIDER=console
INVOICE_QUEUE_PROVIDER=local
```

Validar metadatos sin mostrar contenido:

```bash
sudo stat -c '%U:%G %a %n' /etc/wilmas-fashion/backend.env
sudo test "$(stat -c '%U:%G:%a' /etc/wilmas-fashion/backend.env)" = 'root:wilmas:640'
```

No usar `CHECKOUT_MODE=production` con proveedores mock: la aplicación lo rechaza intencionalmente. Después de habilitar HTTPS, cambiar `CORS_ORIGINS` a `https://DOMINIO` y reiniciar el backend.

## 4. Construir y colocar la aplicación

El frontend ya viene compilado en el artefacto allowlist. En la instancia solo se instalan dependencias productivas del backend y se genera Prisma:

```bash
cd /home/ubuntu/wilmas-release/backend
npm ci --omit=dev
npx prisma generate
```

`npm run build` normal conserva deliberadamente el origen Render para el rollback de Vercel. El modo Lightsail sustituye el fallback interno e inalcanzable `http://localhost` de Axios por `https://invalid.invalid`; no altera la base API del navegador. El builder exige que `dist` no contenga `localhost`, el origen de Render, `127.0.0.1:4000`, URLs PostgreSQL ni claves privadas.

Copiar solo los artefactos previstos; uploads, backups y secretos quedan fuera:

```bash
sudo rsync -a --delete \
  --exclude '.env' --exclude 'uploads' --exclude 'backups' --exclude 'migration-exports' \
  /home/ubuntu/wilmas-release/backend/ /opt/wilmas-fashion/backend/
sudo rsync -a --delete /home/ubuntu/wilmas-release/frontend/dist/ /opt/wilmas-fashion/frontend/dist/
sudo chown -R root:wilmas /opt/wilmas-fashion/backend
sudo chmod -R u=rwX,g=rX,o= /opt/wilmas-fashion/backend
sudo chown -R root:www-data /opt/wilmas-fashion/frontend
sudo chmod -R u=rwX,g=rX,o=rX /opt/wilmas-fashion/frontend
```

No iniciar todavía el backend.

## 5. Migración futura y reconciliación

Esta sección prepara los pasos; no se ejecuta durante la presente entrega.

1. Transferir aparte el JSON que ya pasó `validate-export.js`, comprobar SHA-256 en ambos extremos y colocarlo como `root:wilmas`, modo `0640`, en `/opt/wilmas-fashion/backend/migration-exports/sqlite-export.json`.
2. Aplicar esquema una sola vez, fuera de `ExecStart`:

```bash
sudo systemctl start wilmas-migrate.service
sudo journalctl -u wilmas-migrate.service --no-pager -n 100
```

3. Importar explícitamente 1 usuario, 6 productos y 0 ventas. La unidad valida primero el export, importa y valida el destino; carga `backend.env` directamente, sin evaluarlo como código shell:

```bash
sudo systemctl start wilmas-import.service
sudo journalctl -u wilmas-import.service --no-pager -n 200
```

El reporte debe indicar `valid: true`, origen y destino `users: 1`, `products: 6`, `sales: 0`, emails/SKU únicos, cero diferencias, cero ventas huérfanas y hashes bcrypt válidos. `seed.js` y `verify-import-login.js` permanecen en el repositorio por compatibilidad, pero no entran al artefacto porque contienen o leen la contraseña demo histórica.

4. **Gate obligatorio antes de publicar:** la contraseña demo importada es conocida por el repositorio. Rotarla de manera interactiva; la entrada no se muestra ni queda en argumentos o logs:

```bash
cd /opt/wilmas-fashion/backend
sudo -u wilmas env \
  CONFIRM_PRODUCTION_PASSWORD_ROTATION=yes \
  MIGRATION_EXPORT=/opt/wilmas-fashion/backend/migration-exports/sqlite-export.json \
  /usr/bin/node scripts/migration/rotate-imported-password.js
```

La reconciliación contra el hash original debe terminar antes de esta rotación intencional. El script inicia temporalmente la aplicación en un puerto aleatorio de loopback y exige que el login con la nueva contraseña funcione; no imprime el secreto. No habilitar el backend público, HTTPS ni un futuro cambio DNS si no informa `loginVerified: true`.

5. Con el backend todavía detenido, empaquetar y transferir uploads desde el equipo local:

```powershell
tar -czf artifacts/wilmas-uploads.tar.gz -C backend uploads
$uploadHash = (Get-FileHash artifacts/wilmas-uploads.tar.gz -Algorithm SHA256).Hash.ToLowerInvariant()
"$uploadHash  wilmas-uploads.tar.gz" | Set-Content artifacts/wilmas-uploads.tar.gz.sha256 -Encoding ascii
scp -i C:\ruta\LightsailDefaultKey-us-east-1.pem artifacts/wilmas-uploads.tar.gz* ubuntu@IP_ESTATICA:/home/ubuntu/
```

Validar, extraer en staging y copiar sin borrar el directorio compartido:

```bash
cd /home/ubuntu
sha256sum --check wilmas-uploads.tar.gz.sha256
tar --list --gzip --file=wilmas-uploads.tar.gz
UPLOAD_STAGE="$(sudo mktemp --directory /opt/wilmas-fashion/backups/uploads-import.XXXXXX)"
sudo tar --extract --gzip --no-same-owner --no-same-permissions \
  --file=wilmas-uploads.tar.gz --directory="${UPLOAD_STAGE}"
sudo test -d "${UPLOAD_STAGE}/uploads"
sudo rsync --archive --checksum "${UPLOAD_STAGE}/uploads/" /opt/wilmas-fashion/uploads/
sudo chown -R wilmas:wilmas /opt/wilmas-fashion/uploads
sudo find /opt/wilmas-fashion/uploads -type d -exec chmod 0750 {} +
sudo find /opt/wilmas-fashion/uploads -type f -exec chmod 0640 {} +
sudo find "${UPLOAD_STAGE}/uploads" -type f | wc -l
sudo find /opt/wilmas-fashion/uploads -type f | wc -l
```

Conservar el staging bajo `backups/` hasta terminar la reconciliación. No servir uploads mediante `alias`: Nginx los pasa por Express y bloquea `/uploads/invoices` antes del proxy.

## 6. Arranque, HTTPS y smoke tests

Cuando migración, importación y uploads hayan sido validados:

```bash
sudo systemctl enable --now wilmas-backend.service
sudo systemctl status wilmas-backend.service --no-pager
sudo wilmas-smoke-test http://127.0.0.1
```

Mientras solo exista HTTP, limitarse a estos smoke tests sin credenciales. No probar el login importado, pedidos ni datos personales por una conexión pública sin cifrar.

HTTPS solo puede emitirse después de que un registro A real resuelva a la IP estática. No cambiar DNS en esta fase. Tras una autorización futura:

```bash
sudo bash /home/ubuntu/wilmas-release/ops/lightsail/enable-https.sh DOMINIO EMAIL IP_ESTATICA
sudo wilmas-smoke-test https://DOMINIO
sudo certbot renew --dry-run
```

El smoke test exige 404 en la ruta pública de facturas y verifica que 4000/5432 solo escuchen en loopback. Verificar además configuración y servicios:

```bash
sudo nginx -t
sudo sshd -t
sudo systemd-analyze verify /etc/systemd/system/wilmas-*.service /etc/systemd/system/wilmas-*.timer
sudo logrotate --debug /etc/logrotate.d/wilmas-fashion
sudo ss -ltnp
sudo ufw status verbose
```

Los únicos listeners públicos esperados son 22, 80 y 443; 4000 y 5432 deben aparecer solo en loopback. Probar desde la interfaz: login importado, catálogo de seis productos, creación de pedido, pago mock, reintento idempotente del mismo evento y factura mock privada. No usar credenciales ni proveedores reales.

## 7. Backups y restauración

Antes de activar el timer, ejecutar y validar un backup manual:

```bash
sudo systemctl start wilmas-backup.service
sudo journalctl -u wilmas-backup.service --no-pager -n 100
sudo find /opt/wilmas-fashion/backups -maxdepth 1 -type f -printf '%f %s bytes\n'
sudo systemctl enable --now wilmas-backup.timer
sudo systemctl list-timers wilmas-backup.timer
```

Cada ejecución crea un `pg_dump` custom comprimido y un tar.gz de uploads, valida ambos, genera SHA-256, mueve los archivos atómicamente y conserva siete días. El snapshot automático de las 06:00 UTC captura el dump reciente; conserva siete snapshots y genera el costo documentado.

Restaurar PostgreSQL siempre en una base nueva; el script rechaza `wilmas_fashion` y cualquier base preexistente:

```bash
sudo wilmas-restore-postgresql \
  /opt/wilmas-fashion/backups/postgresql-FECHA.dump \
  wilmas_fashion_restore_REVISION \
  /opt/wilmas-fashion/backups/postgresql-FECHA.dump.sha256
```

Validar la base restaurada antes de cambiar conexiones. Para uploads:

```bash
sudo wilmas-restore-uploads \
  /opt/wilmas-fashion/backups/uploads-FECHA.tar.gz \
  /opt/wilmas-fashion/backups/uploads-FECHA.tar.gz.sha256
```

El restore de uploads solo extrae en `/opt/wilmas-fashion/restore-staging`, rechaza rutas absolutas, traversal y tipos que no sean archivos regulares/directorios, y nunca sobrescribe el directorio vivo. Revisar el staging y después copiarlo manualmente conservando como propietario al usuario del backend:

```bash
sudo rsync --archive --checksum --chown=wilmas:wilmas \
  /opt/wilmas-fashion/restore-staging/uploads.REVISION/ \
  /opt/wilmas-fashion/uploads/
```

Para servidor completo, crear una instancia nueva desde un snapshot automático o desde una copia manual conservada, usar un bundle igual o mayor, validar en una IP temporal y solo después reasociar la IP estática. Los snapshots automáticos se eliminan al eliminar su instancia de origen; conservar como manual el snapshot crítico antes de una operación destructiva.

## 8. Rollback

Mientras no haya cambio DNS, Render y Vercel continúan siendo el camino público y el rollback no requiere tocar usuarios. Después de un cutover futuro:

1. detener cambios de catálogo/pedidos;
2. conservar un snapshot y un `pg_dump` final;
3. si falla solo código, volver al archivo Git anterior, repetir `npm ci`/build y reiniciar systemd;
4. si falla la base, restaurar el dump en una base nueva y cambiar únicamente `DATABASE_URL` después de validar;
5. si falla el host, crear otro desde snapshot, validar y reasociar la IP;
6. si el incidente sigue, revertir el registro DNS a Vercel/Render mediante un cambio autorizado separado.

No eliminar Render, Vercel ni su información hasta superar un periodo de observación acordado. Nunca usar `terraform destroy` como procedimiento de rollback.

## Límite de esta entrega

Permitido: código, documentación, pruebas locales, `terraform init`, `validate` y `plan` del nuevo root. Prohibido aquí: `terraform apply`, `terraform destroy`, `npm run seed`, importación real, despliegue real, cambio DNS, pagos reales, facturas legales, `push`, `merge` o eliminación de los respaldos existentes.
