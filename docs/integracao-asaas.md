# Integracao Asaas - Financeiro NexaWi

Esta integracao adiciona cobranca recorrente ao modulo financeiro usando Asaas.

## Recursos implementados

- Criacao de cliente no Asaas a partir do cliente NexaWi.
- Criacao de cobranca avulsa via API administrativa.
- Criacao de assinatura recorrente via API administrativa.
- Webhook para atualizar pagamentos locais quando o Asaas confirmar, receber, vencer, cancelar ou estornar uma cobranca.
- Registro local em `pagamentos`, preservando o bloqueio por inadimplencia ja existente.

## Variaveis de ambiente

```env
ASAAS_ENV=sandbox
ASAAS_API_KEY=
ASAAS_WEBHOOK_TOKEN=
ASAAS_BASE_URL=
```

Valores:

- `ASAAS_ENV=sandbox` usa `https://api-sandbox.asaas.com/v3`.
- `ASAAS_ENV=production` usa `https://api.asaas.com/v3`.
- `ASAAS_BASE_URL` e opcional, apenas para sobrescrever a URL padrao.
- `ASAAS_WEBHOOK_TOKEN` deve ser um token forte criado por voce no painel do Asaas. Nao use a API key como token de webhook.

## Webhook

Configure no Asaas:

```txt
https://www.nexawi.com.br/api/webhooks/asaas
```

No campo de token/autenticacao do webhook, use o mesmo valor de:

```txt
ASAAS_WEBHOOK_TOKEN
```

O Asaas envia esse token no header:

```txt
asaas-access-token
```

## Banco de dados

Antes de usar em producao, execute:

```txt
docs/sql/2026-05-asaas-financeiro.sql
```

## Uso no painel

1. Abra `/dashboard/financeiro`.
2. Confira se o card mostra `Asaas configurado`.
3. Na tabela `Assinaturas SaaS`, clique em `Recorrente`.
4. O sistema cria a assinatura no Asaas e registra o primeiro pagamento local.
5. Quando o Asaas enviar webhook de pagamento recebido/confirmado, o pagamento local vira `Pago`.
6. Se o pagamento vencer, o webhook marca como `Vencido`, mantendo o bloqueio por inadimplencia.

## Observacao sobre cartao

A API aceita `CREDIT_CARD`, mas a primeira versao operacional do painel foi pensada para PIX e boleto. Para cartao com dados sensiveis, prefira checkout/tokenizacao segura do proprio Asaas antes de coletar qualquer informacao de cartao no painel NexaWi.
