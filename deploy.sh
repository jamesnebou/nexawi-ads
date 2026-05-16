#!/usr/bin/env bash
set -e

cd /srv/nexawi/control-api

wait_for_url() {
  local url="$1"
  local label="$2"
  local max_attempts=30
  local attempt=1

  echo "==> Aguardando ${label}"

  until curl -fsS "$url" >/dev/null; do
    if [ "$attempt" -ge "$max_attempts" ]; then
      echo "ERRO: ${label} não respondeu após ${max_attempts} tentativas."
      echo "==> Status PM2"
      su - nexawiadmin -c 'pm2 list'
      echo "==> Últimos logs"
      su - nexawiadmin -c 'pm2 logs nexawi-control --lines 80 --nostream'
      exit 1
    fi

    echo "Tentativa ${attempt}/${max_attempts}: aguardando servidor subir..."
    attempt=$((attempt + 1))
    sleep 2
  done

  echo "OK: ${label} respondeu."
}

echo "==> Conferindo alterações locais"
git status --short

echo "==> Atualizando código do GitHub"
git pull origin main

echo "==> Instalando dependências"
npm install --include=dev

echo "==> Limpando build antigo"
rm -rf .next

echo "==> Gerando build"
npm run build

echo "==> Ajustando permissões"
chown -R nexawiadmin:nexawiadmin /srv/nexawi/control-api

echo "==> Reiniciando PM2"
su - nexawiadmin -c 'pm2 restart nexawi-control --update-env'

echo "==> Status PM2"
su - nexawiadmin -c 'pm2 list'

wait_for_url "http://localhost:3001/api/control/router/health" "Health check local"
wait_for_url "http://localhost:3001/api/control/router/online" "Online check local"

echo "Deploy concluído com sucesso."
