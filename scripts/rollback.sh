#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/nexawi/control-api}"
PM2_USER="${PM2_USER:-nexawiadmin}"
PM2_APP="${PM2_APP:-nexawi-control}"
TARGET="${1:-}"

if [ -z "$TARGET" ]; then
  echo "Uso: ./scripts/rollback.sh <commit-ou-tag>"
  echo "Exemplo: ./scripts/rollback.sh 66c626f"
  exit 1
fi

cd "$APP_DIR"

echo "==> Rollback NexaWi ADS"
echo "Diretorio: $APP_DIR"
echo "Atual: $(git rev-parse --short HEAD)"
echo "Destino: $TARGET"
echo ""
echo "Esse comando vai aplicar git reset --hard no servidor e reiniciar o PM2."
read -r -p "Digite CONFIRMAR para continuar: " CONFIRMACAO

if [ "$CONFIRMACAO" != "CONFIRMAR" ]; then
  echo "Rollback cancelado."
  exit 1
fi

echo "==> Criando tag local de seguranca"
git tag "backup-before-rollback-$(date +%Y%m%d-%H%M%S)" HEAD

echo "==> Buscando referencias remotas"
git fetch origin

echo "==> Aplicando rollback"
git reset --hard "$TARGET"

echo "==> Instalando dependencias"
npm install --include=dev

echo "==> Gerando build"
npm run build

echo "==> Ajustando permissoes"
chown -R "${PM2_USER}:${PM2_USER}" "$APP_DIR"

echo "==> Reiniciando PM2"
su - "$PM2_USER" -c "pm2 restart ${PM2_APP} --update-env"

echo "==> Validando health"
curl -fsS http://localhost:3001/api/health >/dev/null

echo "Rollback concluido."
