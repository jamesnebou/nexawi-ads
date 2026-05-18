# NexaWi Ads

Plataforma SaaS de publicidade via Wi-Fi. O produto transforma redes Wi-Fi de pracas, shoppings, comercios e eventos em midia local: o usuario acessa o portal, informa dados, aceita LGPD, assiste a um anuncio obrigatorio e depois recebe acesso a internet.

## Stack

- Next.js App Router
- Supabase
- Vercel para front/portal
- VPS com PM2 para API de controle
- MikroTik Hotspot / RouterOS
- Nodemailer para notificacoes e relatorios por e-mail

## Ambiente local

```bash
npm install
npm run dev
```

Aplicacao local:

```txt
http://localhost:3000
```

Antes de rodar, crie `.env` com base em `.env.example`. Nao commitar `.env`.

## Comandos principais

```bash
npm run dev
npm run build
npm run lint
npm run start
```

## Variaveis criticas

- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`: cliente Supabase no navegador.
- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`: acesso administrativo no servidor.
- `CONTROL_API_BASE_URL`: URL da Control API quando rodando via proxy/VPS.
- `NEXAWI_CONTROL_SECRET`: segredo usado entre dashboard e Control API.
- `NEXAWI_CRON_SECRET`: segredo usado por crons e rotas operacionais.
- `ROUTEROS_BASE_URL`, `ROUTEROS_USERNAME`, `ROUTEROS_PASSWORD`: acesso RouterOS REST.
- `SMTP_*` e `ADMIN_ALERT_EMAIL`: envio de notificacoes e relatorios.

## Relatorio comercial por e-mail

Envio manual no painel:

```txt
/dashboard/relatorios/comercial
```

Rota administrativa usada pelo painel:

```txt
POST /api/admin/relatorios/comercial/email
Authorization: Bearer <token admin Supabase>
```

Payload:

```json
{
  "periodo": "ultimos_30",
  "clienteId": "",
  "hotspotId": ""
}
```

## Cron mensal

Rota para envio automatico do relatorio comercial mensal:

```txt
GET /api/cron/relatorios/comercial
```

Autenticacao:

```txt
x-cron-secret: <NEXAWI_CRON_SECRET>
```

Por padrao, envia o periodo `mes_anterior` para `ADMIN_ALERT_EMAIL`.

Exemplo local:

```bash
curl -H "x-cron-secret: $NEXAWI_CRON_SECRET" "http://localhost:3000/api/cron/relatorios/comercial"
```

Exemplo com periodo:

```bash
curl -H "x-cron-secret: $NEXAWI_CRON_SECRET" "http://localhost:3000/api/cron/relatorios/comercial?periodo=ultimos_30"
```

Na VPS, o script pronto usa a app local em `localhost:3001`:

```bash
/srv/nexawi/control-api/scripts/monthly-commercial-report.sh
```

Sugestao de cron mensal, todo dia 1 as 08:10:

```cron
10 8 1 * * /srv/nexawi/control-api/scripts/monthly-commercial-report.sh >> /var/log/nexawi-monthly-report.log 2>&1
```

## Reconcile de sessoes

Script operacional existente:

```bash
/srv/nexawi/control-api/scripts/reconcile.sh
```

Sugestao de cron a cada 5 minutos:

```cron
*/5 * * * * /srv/nexawi/control-api/scripts/reconcile.sh >> /var/log/nexawi-reconcile.log 2>&1
```

## Backup Supabase

O backup usa `pg_dump` e exige `SUPABASE_DB_URL` configurado apenas no `.env` da VPS.

```bash
/srv/nexawi/control-api/scripts/backup-supabase.sh
```

Sugestao de cron diario as 03:20:

```cron
20 3 * * * /srv/nexawi/control-api/scripts/backup-supabase.sh >> /var/log/nexawi-supabase-backup.log 2>&1
```

## Deploy VPS

O deploy operacional usa:

```bash
./deploy.sh
```

Esse script atualiza `/srv/nexawi/control-api`, instala dependencias, gera build, reinicia PM2 e valida endpoints locais da Control API.

Nao rodar deploy sem confirmar antes:

```bash
su - nexawiadmin -c 'pm2 list'
```

## Rollback VPS

Rollback manual por commit ou tag:

```bash
/srv/nexawi/control-api/scripts/rollback.sh <commit-ou-tag>
```

O script exige confirmacao digitando `CONFIRMAR`, cria uma tag local de seguranca antes do reset, gera build e reinicia o PM2.

## Regras que nao devem ser removidas

- Portal deve capturar nome, e-mail, telefone e CPF.
- LGPD deve ser obrigatoria.
- Usuario deve assistir anuncio obrigatorio antes da liberacao.
- Preservar controle de sessao, cooldown e reexibicao de anuncios.
- Preservar integracao MikroTik/RouterOS.
- Manter mensagem clara para usuario quando a sessao expirar ou ficar sem internet.
- Nao expor secrets no front-end nem em commits.
