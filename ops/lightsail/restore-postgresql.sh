#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

if [[ ${EUID} -ne 0 ]]; then
  echo "Run this script as root." >&2
  exit 1
fi
if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "Usage: $0 POSTGRESQL_DUMP NEW_DATABASE [SHA256_FILE]" >&2
  exit 1
fi

readonly DUMP_PATH="$1"
readonly TARGET_DATABASE="$2"
readonly CHECKSUM_PATH="${3:-}"

if [[ ! -s ${DUMP_PATH} ]]; then
  echo "PostgreSQL dump is missing or empty: ${DUMP_PATH}" >&2
  exit 1
fi
if [[ ! ${TARGET_DATABASE} =~ ^wilmas_fashion_restore_[a-zA-Z0-9_]+$ ]]; then
  echo "The new database name must match wilmas_fashion_restore_<identifier>." >&2
  exit 1
fi
if [[ -n ${CHECKSUM_PATH} ]]; then
  if [[ ! -s ${CHECKSUM_PATH} ]]; then
    echo "Checksum file is missing or empty: ${CHECKSUM_PATH}" >&2
    exit 1
  fi
  expected_hash="$(awk 'NR == 1 { print $1 }' "${CHECKSUM_PATH}")"
  actual_hash="$(sha256sum "${DUMP_PATH}" | awk '{ print $1 }')"
  if [[ ! ${expected_hash} =~ ^[0-9a-fA-F]{64}$ || ${actual_hash,,} != ${expected_hash,,} ]]; then
    echo "PostgreSQL dump checksum mismatch." >&2
    exit 1
  fi
fi

pg_restore --list "${DUMP_PATH}" >/dev/null
if runuser -u postgres -- psql --no-psqlrc --tuples-only --no-align \
  --command="SELECT 1 FROM pg_database WHERE datname = '${TARGET_DATABASE}'" | grep -qx 1; then
  echo "Refusing to overwrite existing database: ${TARGET_DATABASE}" >&2
  exit 1
fi

runuser -u postgres -- createdb --owner=wilmas "${TARGET_DATABASE}"
if ! runuser -u postgres -- pg_restore \
  --exit-on-error \
  --no-owner \
  --role=wilmas \
  --dbname="${TARGET_DATABASE}" <"${DUMP_PATH}"; then
  echo "Restore failed. The new database was left in place for inspection: ${TARGET_DATABASE}" >&2
  exit 1
fi

runuser -u postgres -- psql --no-psqlrc --set=ON_ERROR_STOP=1 \
  --dbname="${TARGET_DATABASE}" \
  --command='SET ROLE wilmas; SELECT COUNT(*) AS users FROM "User"; SELECT COUNT(*) AS products FROM "Product";'

echo "PostgreSQL restore verified in new database: ${TARGET_DATABASE}"
echo "The live wilmas_fashion database was not modified."
