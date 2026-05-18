#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/nexawi/control-api}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"
BASE_URL="${NEXAWI_LOCAL_BASE_URL:-http://localhost:3001}"
PERIODO="${NEXAWI_REPORT_PERIOD:-mes_anterior}"
DRY_RUN="false"

if [ "${1:-}" = "--dry-run" ]; then
  DRY_RUN="true"
fi

read_env_value() {
  local key="$1"

  if [ ! -f "$ENV_FILE" ]; then
    return 0
  fi

  grep -E "^${key}=" "$ENV_FILE" \
    | tail -n 1 \
    | cut -d= -f2- \
    | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

CRON_SECRET="${NEXAWI_CRON_SECRET:-$(read_env_value NEXAWI_CRON_SECRET)}"

if [ -z "$CRON_SECRET" ]; then
  echo "ERRO: NEXAWI_CRON_SECRET nao configurado."
  exit 1
fi

URL="${BASE_URL}/api/cron/relatorios/comercial?periodo=${PERIODO}"

if [ "$DRY_RUN" = "true" ]; then
  echo "DRY_RUN: chamaria ${URL}"
  exit 0
fi

curl -fsS "$URL" \
  -H "x-cron-secret: ${CRON_SECRET}"

echo ""
