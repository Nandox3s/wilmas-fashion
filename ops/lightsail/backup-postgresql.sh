#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

readonly BACKUP_ROOT=/opt/wilmas-fashion/backups
readonly UPLOADS_ROOT=/opt/wilmas-fashion/uploads
database_name="${DATABASE_NAME:-}"
if [[ -z ${database_name} && -f /etc/wilmas-fashion/backend.env ]]; then
  database_url="$(sed -n 's/^DATABASE_URL="\(.*\)"$/\1/p' /etc/wilmas-fashion/backend.env | head -n 1)"
  if [[ ${database_url} =~ /([a-zA-Z0-9_]+)\?schema=public$ ]]; then
    database_name="${BASH_REMATCH[1]}"
  fi
fi
readonly DATABASE_NAME="${database_name:-wilmas_fashion}"
unset database_name database_url

if [[ ${EUID} -ne 0 ]]; then
  echo "This backup must run as root." >&2
  exit 1
fi
if [[ ! ${DATABASE_NAME} =~ ^wilmas_fashion(_restore_[a-zA-Z0-9_]+)?$ ]]; then
  echo "Refusing invalid database backup target." >&2
  exit 1
fi

install -d -o root -g root -m 0700 "${BACKUP_ROOT}"
exec 9>"${BACKUP_ROOT}/.backup.lock"
if ! flock -n 9; then
  echo "Another Wilmas Fashion backup is already running." >&2
  exit 1
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
database_name="postgresql-${stamp}.dump"
uploads_name="uploads-${stamp}.tar.gz"
database_tmp="$(mktemp --tmpdir="${BACKUP_ROOT}" ".${database_name}.XXXXXX")"
uploads_tmp="$(mktemp --tmpdir="${BACKUP_ROOT}" ".${uploads_name}.XXXXXX")"

case "${database_tmp}" in
  "${BACKUP_ROOT}"/.postgresql-*) ;;
  *) echo "Refusing unexpected temporary database backup path." >&2; exit 1 ;;
esac
case "${uploads_tmp}" in
  "${BACKUP_ROOT}"/.uploads-*) ;;
  *) echo "Refusing unexpected temporary uploads backup path." >&2; exit 1 ;;
esac

cleanup() {
  rm -f -- "${database_tmp}" "${uploads_tmp}"
}
trap cleanup EXIT

runuser -u postgres -- pg_dump --format=custom --compress=6 --dbname="${DATABASE_NAME}" >"${database_tmp}"
test -s "${database_tmp}"
pg_restore --list "${database_tmp}" >/dev/null

tar --create --gzip --file="${uploads_tmp}" --directory="${UPLOADS_ROOT}" .
test -s "${uploads_tmp}"
tar --list --gzip --file="${uploads_tmp}" >/dev/null

mv -- "${database_tmp}" "${BACKUP_ROOT}/${database_name}"
mv -- "${uploads_tmp}" "${BACKUP_ROOT}/${uploads_name}"

(
  cd "${BACKUP_ROOT}"
  sha256sum "${database_name}" >"${database_name}.sha256"
  sha256sum "${uploads_name}" >"${uploads_name}.sha256"
)

find "${BACKUP_ROOT}" -maxdepth 1 -type f -name 'postgresql-*.dump' -mtime +6 -delete
find "${BACKUP_ROOT}" -maxdepth 1 -type f -name 'postgresql-*.dump.sha256' -mtime +6 -delete
find "${BACKUP_ROOT}" -maxdepth 1 -type f -name 'uploads-*.tar.gz' -mtime +6 -delete
find "${BACKUP_ROOT}" -maxdepth 1 -type f -name 'uploads-*.tar.gz.sha256' -mtime +6 -delete

echo "Backup completed: ${database_name}, ${uploads_name}"
