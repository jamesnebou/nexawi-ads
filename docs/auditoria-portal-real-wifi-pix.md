# Auditoria presencial do portal real - NexaWi

Use este checklist em campo, conectado ao hotspot real. Registre data, hotspot, aparelho, MAC, IP recebido e resultado.

## Preparacao

- Confirmar que o hotspot correto esta selecionado no painel.
- Confirmar que a Control API responde em `/api/control/router/health`.
- Confirmar que o MikroTik mostra o cliente em `/ip hotspot host print detail`.
- Confirmar que a rede do cliente recebe IP da sub-rede esperada, por exemplo `192.168.88.0/24`.
- Confirmar que o walled garden permite `www.nexawi.com.br`, Efí e Asaas conforme o modo testado.

## Android

1. Ativar MAC aleatorio na rede Wi-Fi.
2. Esquecer a rede e conectar novamente.
3. Validar se o portal abre automaticamente.
4. Testar modo Anuncio: cadastro, opt-in, anuncio obrigatorio, CTA e liberacao.
5. Testar modo Pix: plano, pagamento, status pago e botao de liberacao.
6. Testar modo Hibrido: escolher anuncio gratis e escolher Pix pago.
7. Abrir `neverssl.com` antes da liberacao: deve ficar bloqueado.
8. Abrir `neverssl.com` apos liberacao: deve navegar.
9. Repetir com MAC fixo do aparelho.

## iPhone

1. Ativar endereco privado da rede Wi-Fi.
2. Esquecer a rede e conectar novamente.
3. Validar abertura do portal cativo.
4. Repetir os testes de Anuncio, Pix e Hibrido.
5. Validar se a tela nao fecha antes do fim do anuncio/pagamento.
6. Repetir com endereco privado desativado.

## Comandos MikroTik para conferencia

```routeros
/ip hotspot host print detail where mac-address=AA:BB:CC:DD:EE:FF
/ip hotspot ip-binding print detail where mac-address=AA:BB:CC:DD:EE:FF
/ip dhcp-server lease print detail where mac-address=AA:BB:CC:DD:EE:FF
/queue simple print detail where name~"nexawi-client"
```

## Resultado esperado

- Antes da regra do portal: internet bloqueada fora dos dominios liberados.
- Depois do anuncio ou pagamento pago: `ip-binding type=bypassed` criado para o MAC correto.
- Fila de velocidade criada com o limite do plano ou politica configurada.
- Venda Pix muda para `pago` via webhook/verificacao e para `autorizado` apos liberacao.
- Venda pendente pode ser verificada manualmente no dashboard.
- Suporte consegue expirar/cancelar pendentes sem apagar historico.

## Sinais de problema

- Portal demora mais de 30 segundos para abrir: verificar DNS, link da operadora e walled garden.
- Pagamento pago nao muda status: verificar webhook Efí e botao `Verificar` no dashboard.
- Botao liberar falha: conferir MAC, IP, Control API e resposta do MikroTik.
- Aparelho troca MAC ao reconectar: testar com MAC fixo e revisar lead/venda do MAC anterior.
