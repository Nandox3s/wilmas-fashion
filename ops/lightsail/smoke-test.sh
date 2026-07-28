#!/usr/bin/env bash
set -Eeuo pipefail

readonly BASE_URL="${1:-http://127.0.0.1}"
if [[ ! ${BASE_URL} =~ ^https?://[^/@[:space:]]+(:[0-9]+)?$ ]]; then
  echo "Usage: $0 [http[s]://HOST[:PORT]]" >&2
  exit 1
fi

curl --fail --silent --show-error --max-time 10 "${BASE_URL}/" >/dev/null
curl --fail --silent --show-error --max-time 10 "${BASE_URL}/api/ping" >/dev/null
curl --fail --silent --show-error --max-time 10 "${BASE_URL}/api/products?limit=100" >/dev/null

invoice_status="$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 10 \
  "${BASE_URL}/uploads/invoices/smoke-probe.pdf")"
if [[ ${invoice_status} != 404 ]]; then
  echo "Private invoice path returned ${invoice_status}; expected 404." >&2
  exit 1
fi

if ss -H -ltn | awk '
  $4 ~ /:(4000|5432)$/ && $4 !~ /^127\.0\.0\.1:/ && $4 !~ /^\[::1\]:/ { print; found = 1 }
  END { exit found ? 0 : 1 }
' | grep -q .; then
  echo "Backend or PostgreSQL has a non-loopback listener:" >&2
  ss -H -ltn | awk '$4 ~ /:(4000|5432)$/' >&2
  exit 1
fi

if ! ss -H -ltn | awk '$4 ~ /:80$/ { found = 1 } END { exit found ? 0 : 1 }'; then
  echo "Nginx is not listening on port 80." >&2
  exit 1
fi

echo "Smoke tests passed for ${BASE_URL}; invoice files are private and ports 4000/5432 are loopback-only."
