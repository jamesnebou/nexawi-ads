#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/srv/nexawi/control-api"
PM2_USER="nexawiadmin"
PM2_APP="nexawi-control"

cd "$APP_DIR"

wait_for_url() {
  local url="$1"
  local label="$2"
  local max_attempts=30
  local attempt=1

  echo "==> Aguardando ${label}"

  until curl -fsS "$url" >/dev/null; do
    if [ "$attempt" -ge "$max_attempts" ]; then
      echo "ERRO: ${label} nao respondeu apos ${max_attempts} tentativas."
      echo "==> Status PM2"
      su - "$PM2_USER" -c 'pm2 list'
      echo "==> Ultimos logs"
      su - "$PM2_USER" -c "pm2 logs ${PM2_APP} --lines 80 --nostream"
      exit 1
    fi

    echo "Tentativa ${attempt}/${max_attempts}: aguardando servidor subir..."
    attempt=$((attempt + 1))
    sleep 2
  done

  echo "OK: ${label} respondeu."
}

warn_for_url() {
  local url="$1"
  local label="$2"

  echo "==> Verificando ${label}"

  if curl -fsS "$url" >/dev/null; then
    echo "OK: ${label} respondeu."
  else
    echo "AVISO: ${label} nao respondeu. O app subiu, mas a integracao operacional precisa ser verificada."
  fi
}

echo "==> Conferindo alteracoes locais"
git status --short

echo "==> Salvando referencia antes do deploy"
git rev-parse --short HEAD > .last_deploy_before

echo "==> Atualizando codigo do GitHub"
git pull origin main

echo "==> Instalando dependencias"
npm install --include=dev

echo "==> Limpando build antigo"
rm -rf .next

echo "==> Gerando build"
npm run build

echo "==> Ajustando permissoes"
chown -R "${PM2_USER}:${PM2_USER}" "$APP_DIR"

echo "==> Reiniciando PM2"
su - "$PM2_USER" -c "pm2 restart ${PM2_APP} --update-env"

echo "==> Status PM2"
su - "$PM2_USER" -c 'pm2 list'

wait_for_url "http://localhost:3001/api/health" "Health check da aplicacao"
warn_for_url "http://localhost:3001/api/control/router/health" "Health RouterOS"
warn_for_url "http://localhost:3001/api/control/router/online" "Online RouterOS"

echo "Deploy concluido com sucesso."
