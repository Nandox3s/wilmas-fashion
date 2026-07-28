#!/usr/bin/env bash
set -euo pipefail
npm ci --omit=dev
npx prisma generate
