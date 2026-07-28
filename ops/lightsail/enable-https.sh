#!/usr/bin/env bash
set -Eeuo pipefail
umask 027

if [[ ${EUID} -ne 0 ]]; then
  echo "Run this script as root." >&2
  exit 1
fi

if [[ $# -ne 3 ]]; then
  echo "Usage: $0 DOMAIN EMAIL EXPECTED_STATIC_IPV4" >&2
  exit 1
fi

readonly DOMAIN_NAME="$1"
readonly CERTBOT_EMAIL="$2"
readonly EXPECTED_IP="$3"
readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly SITE_PATH=/etc/nginx/sites-available/wilmas-fashion

if [[ ! ${DOMAIN_NAME} =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])$ ]]; then
  echo "Invalid domain name." >&2
  exit 1
fi
if [[ ! ${CERTBOT_EMAIL} =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
  echo "Invalid email address." >&2
  exit 1
fi
if [[ ! ${EXPECTED_IP} =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
  echo "Invalid expected IPv4 address." >&2
  exit 1
fi

mapfile -t resolved_ips < <(getent ahostsv4 "${DOMAIN_NAME}" | awk '{print $1}' | sort -u)
if [[ ${#resolved_ips[@]} -ne 1 || ${resolved_ips[0]:-} != "${EXPECTED_IP}" ]]; then
  echo "DNS A for ${DOMAIN_NAME} must resolve only to the expected static IP; HTTPS was not changed." >&2
  exit 1
fi

exec 9>/run/lock/wilmas-https.lock
if ! flock -n 9; then
  echo "Another HTTPS configuration is running." >&2
  exit 1
fi

if [[ ! -s "/etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem" ]]; then
  certbot certonly \
    --webroot \
    --webroot-path /var/www/certbot \
    --domain "${DOMAIN_NAME}" \
    --email "${CERTBOT_EMAIL}" \
    --agree-tos \
    --no-eff-email \
    --non-interactive
fi

site_tmp="$(mktemp)"
trap 'rm -f -- "${site_tmp}"' EXIT
sed "s/__DOMAIN_NAME__/${DOMAIN_NAME}/g" "${SCRIPT_DIR}/templates/nginx-https.conf" >"${site_tmp}"
install -o root -g root -m 0644 "${site_tmp}" "${SITE_PATH}"
install -d -o root -g root -m 0755 /etc/letsencrypt/renewal-hooks/deploy
install -o root -g root -m 0755 \
  "${SCRIPT_DIR}/templates/reload-nginx-after-renewal" \
  /etc/letsencrypt/renewal-hooks/deploy/reload-nginx
nginx -t
systemctl reload nginx
systemctl enable --now certbot.timer

echo "HTTPS configuration installed for ${DOMAIN_NAME}."
