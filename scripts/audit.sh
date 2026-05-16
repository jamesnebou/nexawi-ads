#!/usr/bin/env bash

echo "=================================================="
echo "NEXAWI ADS - AUDITORIA RÁPIDA"
echo "Data: $(date)"
echo "=================================================="

cd /srv/nexawi/control-api || exit 1

echo ""
echo "== Git =="
git status --short
git log --oneline -3

echo ""
echo "== PM2 =="
su - nexawiadmin -c 'pm2 list'

echo ""
echo "== Health Control API =="
curl -s http://localhost:3001/api/control/router/health | head -c 500
echo ""

echo ""
echo "== Online Control API =="
curl -s http://localhost:3001/api/control/router/online
echo ""

echo ""
echo "== Reconcile =="
/srv/nexawi/control-api/scripts/reconcile.sh
echo ""

echo ""
echo "== Preset Meta/DoH no código =="
grep -n "META_PRESET_DOMAINS\|createdAddressListRulesCount\|NEXAWI_BLOCK_DOH" src/lib/routeros-rest.js | head -20

echo ""
echo "== Policy status GET/POST =="
grep -n "export async function POST\|export async function GET" src/app/api/control/router/policy/status/route.js

echo ""
echo "=================================================="
echo "Auditoria concluída."
echo "=================================================="
