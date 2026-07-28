#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

readonly ENV_FILE=/etc/wilmas-fashion/backend.env
readonly DATABASE_NAME=wilmas_fashion
readonly DATABASE_ROLE=wilmas

if [[ ${EUID} -ne 0 ]]; then
  echo "Run this script as root." >&2
  exit 1
fi
if [[ ! -f ${ENV_FILE} ]]; then
  echo "Run provision-base.sh first; ${ENV_FILE} does not exist." >&2
  exit 1
fi

exec 9>/run/lock/wilmas-database.lock
if ! flock -n 9; then
  echo "Another database configuration is running." >&2
  exit 1
fi

existing_line="$(grep -m1 '^DATABASE_URL=' "${ENV_FILE}" || true)"
if [[ -n ${existing_line} ]]; then
  existing_url="${existing_line#DATABASE_URL=}"
  existing_url="${existing_url%\"}"
  existing_url="${existing_url#\"}"
  if [[ ${existing_url} =~ ^postgresql://wilmas:([0-9a-f]{48})@127\.0\.0\.1:5432/wilmas_fashion\?schema=public$ ]] && \
    PGPASSWORD="${BASH_REMATCH[1]}" psql \
      --host=127.0.0.1 --port=5432 --username=wilmas --dbname=wilmas_fashion \
      --no-psqlrc --tuples-only --command='SELECT 1' >/dev/null; then
    echo "Database credentials are already configured and valid; no password was changed."
    exit 0
  fi
  echo "DATABASE_URL exists but cannot connect. Refusing to rotate credentials automatically." >&2
  exit 1
fi

database_password="$(openssl rand -hex 24)"
runuser -u postgres -- psql --no-psqlrc --set=ON_ERROR_STOP=1 >/dev/null <<SQL
ALTER ROLE ${DATABASE_ROLE} WITH LOGIN PASSWORD '${database_password}';
SQL

env_tmp="$(mktemp --tmpdir=/etc/wilmas-fashion backend.env.XXXXXX)"
trap 'rm -f -- "${env_tmp}"' EXIT
awk '!/^DATABASE_URL=/' "${ENV_FILE}" >"${env_tmp}"
printf 'DATABASE_URL="postgresql://%s:%s@127.0.0.1:5432/%s?schema=public"\n' \
  "${DATABASE_ROLE}" "${database_password}" "${DATABASE_NAME}" >>"${env_tmp}"
install -o root -g wilmas -m 0640 "${env_tmp}" "${ENV_FILE}"

PGPASSWORD="${database_password}" psql \
  --host=127.0.0.1 --port=5432 --username="${DATABASE_ROLE}" --dbname="${DATABASE_NAME}" \
  --no-psqlrc --tuples-only --command='SELECT 1' >/dev/null
unset database_password

echo "Random PostgreSQL credentials were stored in ${ENV_FILE}; the secret was not printed."
