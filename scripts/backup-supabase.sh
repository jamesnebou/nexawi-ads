#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/nexawi/control-api}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups/supabase}"

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

DB_URL="${SUPABASE_DB_URL:-$(read_env_value SUPABASE_DB_URL)}"

if [ -z "$DB_URL" ]; then
  echo "ERRO: SUPABASE_DB_URL nao configurada."
  echo "Configure a connection string Postgres do Supabase apenas no .env da VPS."
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "ERRO: pg_dump nao encontrado no servidor."
  exit 1
fi

mkdir -p "$BACKUP_DIR"

OUTPUT_FILE="$BACKUP_DIR/nexawi-supabase-$(date +%Y%m%d-%H%M%S).dump"

echo "==> Gerando backup Supabase"
pg_dump "$DB_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="$OUTPUT_FILE"

chmod 600 "$OUTPUT_FILE"

echo "Backup criado: $OUTPUT_FILE"
