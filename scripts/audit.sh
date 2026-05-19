#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/srv/nexawi/control-api"

echo "=================================================="
echo "NEXAWI ADS - AUDITORIA RAPIDA"
echo "Data: $(date)"
echo "=================================================="

cd "$APP_DIR"

echo ""
echo "== Git =="
git status --short
git log --oneline -3

echo ""
echo "== PM2 =="
su - nexawiadmin -c 'pm2 list'

echo ""
echo "== Health Aplicacao =="
curl -fsS http://localhost:3001/api/health | head -c 500
echo ""

echo ""
echo "== Health RouterOS =="
curl -fsS http://localhost:3001/api/control/router/health | head -c 500 || true
echo ""

echo ""
echo "== Online Control API =="
curl -fsS http://localhost:3001/api/control/router/online || true
echo ""

echo ""
echo "== Reconcile =="
"$APP_DIR/scripts/reconcile.sh"
echo ""

echo ""
echo "== Relatorio comercial mensal cron =="
"$APP_DIR/scripts/monthly-commercial-report.sh" --dry-run
echo ""

echo ""
echo "== Presets e policy no codigo =="
grep -n "META_PRESET_DOMAINS\|createdAddressListRulesCount\|NEXAWI_BLOCK_DOH" src/lib/routeros-rest.js | head -20 || true

echo ""
echo "== Policy status GET/POST =="
grep -n "export async function POST\|export async function GET" src/app/api/control/router/policy/status/route.js

echo ""
echo "=================================================="
echo "Auditoria concluida."
echo "=================================================="
