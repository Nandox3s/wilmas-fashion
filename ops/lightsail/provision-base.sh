#!/usr/bin/env bash
set -Eeuo pipefail
umask 027

if [[ ${EUID} -ne 0 ]]; then
  echo "Run this script as root." >&2
  exit 1
fi

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly APP_ROOT=/opt/wilmas-fashion
readonly ENV_ROOT=/etc/wilmas-fashion
readonly ENV_FILE=${ENV_ROOT}/backend.env
readonly DOMAIN_NAME="${DOMAIN_NAME:-_}"

if [[ -z ${SSH_ALLOWED_CIDRS:-} ]]; then
  echo "Set SSH_ALLOWED_CIDRS to one or more comma-separated administrator IPv4 CIDRs." >&2
  exit 1
fi
if [[ ${DOMAIN_NAME} != "_" && ! ${DOMAIN_NAME} =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])$ ]]; then
  echo "DOMAIN_NAME must be a valid FQDN or omitted for the HTTP bootstrap host." >&2
  exit 1
fi

IFS=',' read -r -a ssh_cidrs <<<"${SSH_ALLOWED_CIDRS}"
for index in "${!ssh_cidrs[@]}"; do
  ssh_cidrs[${index}]="${ssh_cidrs[${index}]//[[:space:]]/}"
  cidr="${ssh_cidrs[${index}]}"
  if [[ ! ${cidr} =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}/32$ ]]; then
    echo "Each SSH source must be a valid administrator IPv4 /32." >&2
    exit 1
  fi
  ipv4_address="${cidr%/*}"
  IFS='.' read -r octet_1 octet_2 octet_3 octet_4 <<<"${ipv4_address}"
  for octet in "${octet_1}" "${octet_2}" "${octet_3}" "${octet_4}"; do
    if [[ ! ${octet} =~ ^(0|[1-9][0-9]{0,2})$ ]] || ((10#${octet} > 255)); then
      echo "An SSH source contains an invalid IPv4 address." >&2
      exit 1
    fi
  done
  case "${ipv4_address}" in
    192.0.2.*|198.51.100.*|203.0.113.*)
      echo "RFC 5737 TEST-NET is not a usable administrator SSH source." >&2
      exit 1
      ;;
  esac
done

exec 9>/run/lock/wilmas-provision.lock
if ! flock -n 9; then
  echo "Another provisioning process is running." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y \
  ca-certificates \
  certbot \
  curl \
  gnupg \
  jq \
  logrotate \
  nginx \
  openssl \
  postgresql-16 \
  postgresql-client-16 \
  python3-certbot-nginx \
  rsync \
  ufw \
  util-linux

install -d -o root -g root -m 0755 /etc/apt/keyrings
nodesource_key="$(mktemp)"
trap 'rm -f -- "${nodesource_key}"' EXIT
curl --fail --silent --show-error --location \
  https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
  --output "${nodesource_key}"
gpg --dearmor --yes --output /etc/apt/keyrings/nodesource.gpg "${nodesource_key}"
chmod 0644 /etc/apt/keyrings/nodesource.gpg
printf '%s\n' 'deb [arch=amd64 signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main' \
  >/etc/apt/sources.list.d/nodesource.list
apt-get update
apt-get install -y nodejs

if [[ $(node --version) != v22.* ]]; then
  echo "Node.js 22 installation validation failed." >&2
  exit 1
fi
if [[ $(psql --version) != *" 16."* ]]; then
  echo "PostgreSQL 16 installation validation failed." >&2
  exit 1
fi

getent group wilmas >/dev/null || groupadd --system wilmas
if ! id -u wilmas >/dev/null 2>&1; then
  useradd --system --gid wilmas --home-dir "${APP_ROOT}" --shell /usr/sbin/nologin wilmas
fi
usermod --gid wilmas --home "${APP_ROOT}" --shell /usr/sbin/nologin wilmas

install -d -o root -g root -m 0755 "${APP_ROOT}"
install -d -o root -g wilmas -m 0750 "${APP_ROOT}/backend"
install -d -o root -g www-data -m 0755 "${APP_ROOT}/frontend"
install -d -o wilmas -g wilmas -m 0750 "${APP_ROOT}/uploads"
install -d -o root -g root -m 0700 "${APP_ROOT}/backups"
install -d -o root -g root -m 0755 "${APP_ROOT}/logs"
install -d -o wilmas -g wilmas -m 0750 "${APP_ROOT}/logs/backend"
install -d -o root -g adm -m 0750 "${APP_ROOT}/logs/nginx"
for log_file in backend.log backend-error.log; do
  if [[ ! -e ${APP_ROOT}/logs/backend/${log_file} ]]; then
    install -o wilmas -g wilmas -m 0640 /dev/null "${APP_ROOT}/logs/backend/${log_file}"
  fi
  chown wilmas:wilmas "${APP_ROOT}/logs/backend/${log_file}"
  chmod 0640 "${APP_ROOT}/logs/backend/${log_file}"
done
install -d -o root -g wilmas -m 0750 "${ENV_ROOT}"
install -d -o root -g root -m 0755 /var/www/certbot

if [[ ! -e ${ENV_FILE} ]]; then
  install -o root -g wilmas -m 0640 /dev/null "${ENV_FILE}"
fi
chown root:wilmas "${ENV_FILE}"
chmod 0640 "${ENV_FILE}"

if ! swapon --show=NAME --noheadings | grep -Fxq /swapfile; then
  if [[ ! -e /swapfile ]]; then
    fallocate -l 1G /swapfile
    chmod 0600 /swapfile
    mkswap /swapfile >/dev/null
  fi
  swapon /swapfile
fi
if ! grep -Fq '/swapfile none swap sw 0 0' /etc/fstab; then
  printf '%s\n' '/swapfile none swap sw 0 0' >>/etc/fstab
fi

install -o root -g root -m 0644 \
  "${SCRIPT_DIR}/templates/postgresql-wilmas.conf" \
  /etc/postgresql/16/main/conf.d/99-wilmas.conf
runuser -u postgres -- /usr/lib/postgresql/16/bin/postgres \
  -D /var/lib/postgresql/16/main \
  --config-file=/etc/postgresql/16/main/postgresql.conf \
  -C listen_addresses >/dev/null
systemctl enable --now postgresql
systemctl restart postgresql

if ! runuser -u postgres -- psql --no-psqlrc --tuples-only --no-align \
  --command="SELECT 1 FROM pg_roles WHERE rolname = 'wilmas'" | grep -qx 1; then
  runuser -u postgres -- psql --no-psqlrc --set=ON_ERROR_STOP=1 \
    --command='CREATE ROLE wilmas NOLOGIN'
fi
if ! runuser -u postgres -- psql --no-psqlrc --tuples-only --no-align \
  --command="SELECT 1 FROM pg_database WHERE datname = 'wilmas_fashion'" | grep -qx 1; then
  runuser -u postgres -- createdb --owner=wilmas wilmas_fashion
fi
runuser -u postgres -- psql --no-psqlrc --set=ON_ERROR_STOP=1 \
  --command='ALTER DATABASE wilmas_fashion OWNER TO wilmas'

install -d -o root -g root -m 0755 /etc/ssh/sshd_config.d
install -o root -g root -m 0644 \
  "${SCRIPT_DIR}/templates/sshd-hardening.conf" \
  /etc/ssh/sshd_config.d/00-wilmas-hardening.conf
if [[ -e /etc/ssh/sshd_config.d/99-wilmas-hardening.conf ]]; then
  rm -f -- /etc/ssh/sshd_config.d/99-wilmas-hardening.conf
fi
sshd -t
sshd_effective_config="$(sshd -T)"
grep -qx 'permitrootlogin no' <<<"${sshd_effective_config}"
grep -qx 'passwordauthentication no' <<<"${sshd_effective_config}"
grep -qx 'kbdinteractiveauthentication no' <<<"${sshd_effective_config}"
grep -qx 'pubkeyauthentication yes' <<<"${sshd_effective_config}"
systemctl reload ssh

# This dedicated host is fully managed by this profile. The Lightsail firewall
# remains active while UFW is rebuilt, so reruns converge without retaining an
# obsolete administrator CIDR or an accidental application/database port.
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
for cidr in "${ssh_cidrs[@]}"; do
  ufw allow from "${cidr}" to any port 22 proto tcp comment 'Wilmas restricted SSH'
done
ufw allow 80/tcp comment 'Wilmas HTTP'
ufw allow 443/tcp comment 'Wilmas HTTPS'
ufw --force enable

install -d -o root -g root -m 0755 /etc/nginx/snippets
install -o root -g root -m 0644 \
  "${SCRIPT_DIR}/templates/nginx-app-locations.conf" \
  /etc/nginx/snippets/wilmas-app-locations.conf
install -o root -g root -m 0644 \
  "${SCRIPT_DIR}/templates/nginx-security-headers.conf" \
  /etc/nginx/snippets/wilmas-security-headers.conf
site_tmp="$(mktemp)"
if [[ ! -f /etc/nginx/sites-available/wilmas-fashion ]] || \
  ! grep -Fq 'ssl_certificate ' /etc/nginx/sites-available/wilmas-fashion; then
  sed "s/__DOMAIN_NAME__/${DOMAIN_NAME}/g" "${SCRIPT_DIR}/templates/nginx-http.conf" >"${site_tmp}"
  install -o root -g root -m 0644 "${site_tmp}" /etc/nginx/sites-available/wilmas-fashion
else
  echo "Existing HTTPS virtual host preserved."
fi
rm -f -- "${site_tmp}"
if [[ -L /etc/nginx/sites-enabled/default ]]; then
  unlink /etc/nginx/sites-enabled/default
fi
ln -sfn /etc/nginx/sites-available/wilmas-fashion /etc/nginx/sites-enabled/wilmas-fashion
nginx -t
systemctl enable --now nginx
systemctl reload nginx

install -o root -g root -m 0755 "${SCRIPT_DIR}/backup-postgresql.sh" /usr/local/sbin/wilmas-backup
install -o root -g root -m 0755 "${SCRIPT_DIR}/restore-postgresql.sh" /usr/local/sbin/wilmas-restore-postgresql
install -o root -g root -m 0755 "${SCRIPT_DIR}/restore-uploads.sh" /usr/local/sbin/wilmas-restore-uploads
install -o root -g root -m 0755 "${SCRIPT_DIR}/smoke-test.sh" /usr/local/sbin/wilmas-smoke-test
install -o root -g root -m 0644 "${SCRIPT_DIR}/templates/wilmas-backend.service" /etc/systemd/system/wilmas-backend.service
install -o root -g root -m 0644 "${SCRIPT_DIR}/templates/wilmas-migrate.service" /etc/systemd/system/wilmas-migrate.service
install -o root -g root -m 0644 "${SCRIPT_DIR}/templates/wilmas-import.service" /etc/systemd/system/wilmas-import.service
install -o root -g root -m 0644 "${SCRIPT_DIR}/templates/wilmas-backup.service" /etc/systemd/system/wilmas-backup.service
install -o root -g root -m 0644 "${SCRIPT_DIR}/templates/wilmas-backup.timer" /etc/systemd/system/wilmas-backup.timer
install -o root -g root -m 0644 "${SCRIPT_DIR}/templates/logrotate-wilmas" /etc/logrotate.d/wilmas-fashion
systemctl daemon-reload
systemctl enable certbot.timer

echo "Base provisioning completed without starting the application or backup timer."
echo "Next: run configure-database.sh, complete backend.env, deploy code, migrate, import, and then enable services."
