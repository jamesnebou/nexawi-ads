#!/usr/bin/env bash

ENV_FILE="/srv/nexawi/control-api/.env"

CRON_SECRET="$(
  grep -E '^NEXAWI_CRON_SECRET=' "$ENV_FILE" \
  | tail -n 1 \
  | cut -d= -f2- \
  | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
)"

curl -s -X POST "https://control.nexawi.com.br/api/control/session/reconcile" \
  -H "x-cron-secret: ${CRON_SECRET}"
