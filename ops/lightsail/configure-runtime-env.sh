#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

readonly ENV_FILE=/etc/wilmas-fashion/backend.env
readonly TARGET_DATABASE="${1:-}"
readonly PUBLIC_ORIGIN="${2:-}"

if [[ ${EUID} -ne 0 ]]; then
  echo "Run this script as root." >&2
  exit 1
fi
if [[ ! ${TARGET_DATABASE} =~ ^wilmas_fashion_restore_[a-zA-Z0-9_]+$ ]]; then
  echo "Target database must be a validated restore database." >&2
  exit 1
fi
if [[ ! ${PUBLIC_ORIGIN} =~ ^https://[A-Za-z0-9.-]+$ ]]; then
  echo "Public origin must be an HTTPS origin without a path." >&2
  exit 1
fi

database_url="$(sed -n 's/^DATABASE_URL="\(.*\)"$/\1/p' "${ENV_FILE}" | head -n 1)"
if [[ ! ${database_url} =~ /wilmas_fashion\?schema=public$ ]]; then
  echo "Existing DATABASE_URL does not target the expected bootstrap database." >&2
  exit 1
fi
database_url="${database_url%/wilmas_fashion?schema=public}/${TARGET_DATABASE}?schema=public"
jwt_secret="$(openssl rand -hex 32)"

env_tmp="$(mktemp --tmpdir=/etc/wilmas-fashion backend.env.XXXXXX)"
trap 'rm -f -- "${env_tmp}"' EXIT
cat >"${env_tmp}" <<EOF
DATABASE_URL="${database_url}"
JWT_SECRET="${jwt_secret}"
NODE_ENV=production
HOST=127.0.0.1
PORT=4000
TRUST_PROXY=1
CORS_ORIGINS="${PUBLIC_ORIGIN}"
FRONTEND_URL="${PUBLIC_ORIGIN}"
API_URL="${PUBLIC_ORIGIN}"
UPLOADS_DIR=/opt/wilmas-fashion/uploads
STORAGE_PROVIDER=local
CHECKOUT_MODE=demo
PAYMENT_PROVIDER=mock
PAYPHONE_MOCK_SERVER_ENABLED=false
PAYPHONE_ENV=production
PAYPHONE_API_BASE=https://pay.payphonetodoesposible.com/api
PAYPHONE_TOKEN=
PAYPHONE_STORE_ID=
PAYPHONE_CLIENT_TRANSACTION_PREFIX=WF
PAYPHONE_RESPONSE_URL=${PUBLIC_ORIGIN}/pago/resultado
PAYPHONE_ALLOWED_DOMAIN=${PUBLIC_ORIGIN}
PAYPHONE_CANCELLATION_URL=${PUBLIC_ORIGIN}/checkout
INVOICE_PROVIDER=mock
INVOICE_QUEUE_PROVIDER=local
EMAIL_PROVIDER=console
SHIPPING_PROVIDER=manual
GOOGLE_CLIENT_ID=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
EOF

install -o root -g wilmas -m 0640 "${env_tmp}" "${ENV_FILE}"
unset database_url jwt_secret
echo "Runtime environment configured without printing secrets."
