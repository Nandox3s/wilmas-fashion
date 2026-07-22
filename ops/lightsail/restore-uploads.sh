#!/usr/bin/env bash
set -Eeuo pipefail
umask 027

if [[ ${EUID} -ne 0 ]]; then
  echo "Run this script as root." >&2
  exit 1
fi
if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: $0 UPLOADS_ARCHIVE [SHA256_FILE]" >&2
  exit 1
fi

readonly ARCHIVE_PATH="$1"
readonly CHECKSUM_PATH="${2:-}"
readonly STAGING_ROOT=/opt/wilmas-fashion/restore-staging
readonly MAX_ARCHIVE_ENTRIES="${WILMAS_RESTORE_MAX_ENTRIES:-20000}"
readonly MAX_UNCOMPRESSED_BYTES="${WILMAS_RESTORE_MAX_BYTES:-10737418240}"

if [[ ! ${MAX_ARCHIVE_ENTRIES} =~ ^[1-9][0-9]*$ || ! ${MAX_UNCOMPRESSED_BYTES} =~ ^[1-9][0-9]*$ ]]; then
  echo "Restore limits must be positive integers." >&2
  exit 1
fi

if [[ ! -s ${ARCHIVE_PATH} ]]; then
  echo "Uploads archive is missing or empty: ${ARCHIVE_PATH}" >&2
  exit 1
fi
if [[ -n ${CHECKSUM_PATH} ]]; then
  if [[ ! -s ${CHECKSUM_PATH} ]]; then
    echo "Checksum file is missing or empty: ${CHECKSUM_PATH}" >&2
    exit 1
  fi
  expected_hash="$(awk 'NR == 1 { print $1 }' "${CHECKSUM_PATH}")"
  actual_hash="$(sha256sum "${ARCHIVE_PATH}" | awk '{ print $1 }')"
  if [[ ! ${expected_hash} =~ ^[0-9a-fA-F]{64}$ || ${actual_hash,,} != ${expected_hash,,} ]]; then
    echo "Uploads archive checksum mismatch." >&2
    exit 1
  fi
fi

if ! LC_ALL=C tar \
  --list \
  --verbose \
  --gzip \
  --numeric-owner \
  --quoting-style=escape \
  --file="${ARCHIVE_PATH}" |
  awk \
    -v max_entries="${MAX_ARCHIVE_ENTRIES}" \
    -v max_bytes="${MAX_UNCOMPRESSED_BYTES}" '
      {
        entry_type = substr($1, 1, 1)
        if (entry_type != "-" && entry_type != "d") exit 1
        if ($3 !~ /^[0-9]+$/) exit 1
        entries += 1
        bytes += $3
        if (entries > max_entries || bytes > max_bytes) exit 1
      }
      END { if (entries == 0) exit 1 }
    '
then
  echo "Uploads archive contains unsupported entry types or exceeds the restore limits." >&2
  exit 1
fi

mapfile -t archive_entries < <(tar --list --gzip --quoting-style=escape --file="${ARCHIVE_PATH}")
if [[ ${#archive_entries[@]} -eq 0 ]]; then
  echo "Uploads archive has no entries." >&2
  exit 1
fi
for entry in "${archive_entries[@]}"; do
  case "${entry}" in
    /*|..|../*|*/../*|*/..)
      echo "Unsafe uploads archive path: ${entry}" >&2
      exit 1
      ;;
  esac
done

install -d -o root -g root -m 0700 "${STAGING_ROOT}"
staging_path="$(mktemp --directory --tmpdir="${STAGING_ROOT}" uploads.XXXXXXXX)"
case "${staging_path}" in
  "${STAGING_ROOT}"/uploads.*) ;;
  *) echo "Refusing unexpected restore staging path." >&2; exit 1 ;;
esac

tar \
  --extract \
  --gzip \
  --file="${ARCHIVE_PATH}" \
  --directory="${staging_path}" \
  --no-same-owner \
  --no-same-permissions
chown -R root:wilmas "${staging_path}"
chmod -R u=rwX,g=rX,o= "${staging_path}"

echo "Uploads restored only to staging: ${staging_path}"
echo "Review it, then use rsync --archive --checksum --chown=wilmas:wilmas into /opt/wilmas-fashion/uploads."
