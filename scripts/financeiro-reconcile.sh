#!/usr/bin/env bash

set -euo pipefail

ENV_FILE="${NEXAWI_ENV_FILE:-/srv/nexawi/control-api/.env}"
BASE_URL="${NEXAWI_CONTROL_BASE_URL:-http://localhost:3001}"

if [ ! -f "$ENV_FILE" ]; then
  echo "ENV_FILE_NOT_FOUND: $ENV_FILE" >&2
  exit 1
fi

CRON_SECRET="$(
  grep -E '^NEXAWI_CRON_SECRET=' "$ENV_FILE" \
  | tail -n 1 \
  | cut -d= -f2- \
  | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
)"

if [ -z "$CRON_SECRET" ]; then
  echo "NEXAWI_CRON_SECRET_NOT_FOUND" >&2
  exit 1
fi

curl -fsS -X POST "${BASE_URL%/}/api/cron/financeiro/reconcile" \
  -H "x-cron-secret: ${CRON_SECRET}"
