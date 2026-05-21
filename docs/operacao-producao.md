# Operacao de Producao NexaWi Ads

Este checklist fecha a rotina minima para operar o SaaS em producao sem depender de memoria ou comandos soltos.

## 1. Deploy

Na VPS:

```bash
cd /srv/nexawi/control-api
git fetch origin main
git status --short --branch
git rev-parse --short HEAD
git rev-parse --short origin/main
bash deploy.sh
```

Resultado esperado:

- `git status` sem alteracoes locais inesperadas.
- `HEAD` igual a `origin/main` depois do deploy.
- `next build` concluido.
- PM2 `nexawi-control` online.
- `/api/health` respondendo `ok: true`.

## 2. Health checks

Na VPS:

```bash
curl -fsS http://localhost:3001/api/health
curl -fsS http://localhost:3001/api/control/router/online || true
curl -fsS http://localhost:3001/api/control/router/health || true
```

Os endpoints do MikroTik podem falhar se o roteador estiver desligado ou sem WireGuard ativo. Isso nao significa que a aplicacao caiu.

## 3. Variaveis obrigatorias

Vercel e VPS:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXAWI_CRON_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `ADMIN_ALERT_EMAIL`
- `ASAAS_ENV`
- `ASAAS_API_KEY`
- `ASAAS_WEBHOOK_TOKEN`
- `ASAAS_FINE_PERCENT`
- `ASAAS_INTEREST_PERCENT`

Somente VPS / Control API:

- `CONTROL_API_MODE`
- `CONTROL_API_BASE_URL`
- `NEXAWI_CONTROL_SECRET`
- `ROUTEROS_BASE_URL`
- `ROUTEROS_USERNAME`
- `ROUTEROS_PASSWORD`
- `ROUTEROS_HOTSPOT_SERVER`
- `SUPABASE_DB_URL`

Nunca expor `SUPABASE_SERVICE_ROLE_KEY`, `ASAAS_API_KEY`, `NEXAWI_CRON_SECRET`, `NEXAWI_CONTROL_SECRET` ou senha do MikroTik no navegador, prints ou commits.

## 4. Crons obrigatorios

Ver crons ativos:

```bash
crontab -l
```

Linhas recomendadas:

```cron
*/5 * * * * /srv/nexawi/control-api/scripts/reconcile.sh >> /var/log/nexawi-reconcile.log 2>&1
0 8 * * * /srv/nexawi/control-api/scripts/financeiro-reconcile.sh >> /var/log/nexawi-financeiro-reconcile.log 2>&1
10 8 1 * * /srv/nexawi/control-api/scripts/monthly-commercial-report.sh >> /var/log/nexawi-monthly-report.log 2>&1
20 3 * * * /srv/nexawi/control-api/scripts/backup-supabase.sh >> /var/log/nexawi-supabase-backup.log 2>&1
```

Testes manuais:

```bash
bash /srv/nexawi/control-api/scripts/reconcile.sh
bash /srv/nexawi/control-api/scripts/financeiro-reconcile.sh
bash /srv/nexawi/control-api/scripts/monthly-commercial-report.sh --dry-run
bash /srv/nexawi/control-api/scripts/backup-supabase.sh
```

O reconcile financeiro altera pagamentos vencidos. Rodar manualmente apenas quando for aceitavel sincronizar a inadimplencia naquele momento.

## 5. Asaas

No Asaas:

- Webhook apontando para `https://www.nexawi.com.br/api/webhooks/asaas`.
- Token do webhook igual ao `ASAAS_WEBHOOK_TOKEN`.
- PIX, boleto e cartao habilitados conforme disponibilidade da conta.
- Juros e multa configurados tambem no sistema por `ASAAS_INTEREST_PERCENT` e `ASAAS_FINE_PERCENT`.

No painel:

- Criar uma assinatura teste.
- Confirmar que a cobranca aparece no Asaas.
- Confirmar que pagamento recebido altera status para `Pago`.
- Confirmar que link de pagamento aparece na area do cliente.

## 6. MikroTik

Para cada cidade:

- Manual aplicado: `docs/manual-mikrotik-nexawi.md`.
- Checklist aplicado: `docs/checklist-nova-cidade.md`.
- WireGuard com handshake recente.
- `ROUTEROS_BASE_URL` apontando para o IP privado do tunel, por exemplo `http://10.70.0.2`.
- Hotspot server real selecionado, por exemplo `hotspot1`.
- Teste de bloqueio e desbloqueio feito pelo painel em `/dashboard/rede`.

## 7. Backup e rollback

Backup manual:

```bash
bash /srv/nexawi/control-api/scripts/backup-supabase.sh
```

Rollback:

```bash
bash /srv/nexawi/control-api/scripts/rollback.sh <commit-ou-tag>
```

O rollback pede confirmacao e cria tag local de seguranca antes de mover o codigo.

## 8. Auditoria rapida

No painel:

```txt
/dashboard/operacao
```

Na VPS:

```bash
bash /srv/nexawi/control-api/scripts/audit.sh
```

Esse comando resume Git, PM2, health da aplicacao, status RouterOS, reconcile de sessao, reconcile financeiro e relatorio mensal em modo seguro.

## 9. Teste ponta a ponta

Execute este fluxo antes de considerar uma nova cidade ou cliente como validado:

1. Abrir a landing page, selecionar um plano e enviar o formulario de interesse.
2. Confirmar que o lead entrou no CRM com plano escolhido e valor potencial.
3. Converter o lead em cliente/anunciante.
4. Criar assinatura/cobranca pelo financeiro e confirmar a cobranca no Asaas.
5. Confirmar que o link de pagamento aparece na area do cliente.
6. Pagar uma cobranca teste e validar status `Pago` no painel.
7. Criar anuncio ativo vinculado ao cliente e ao hotspot correto.
8. Abrir o portal no celular, preencher dados obrigatorios e aceitar LGPD.
9. Confirmar anuncio obrigatorio, timer, CTA e liberacao depois da regra cumprida.
10. Confirmar lead, impressao, clique e CTR no relatorio comercial.
11. Enviar relatorio por e-mail e validar anexos PDF/CSV.
12. Com o MikroTik online, testar bloqueio/desbloqueio em `/dashboard/rede`.
