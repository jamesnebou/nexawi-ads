# Instalar novo ponto Wi-Fi NexaWi

Checklist curto para colocar um novo ponto em producao sem depender de memoria.

## 1. Antes de ir ao local

- Criar o hotspot em `/dashboard/hotspots` no modo `Anuncios` inicialmente.
- Criar ou vincular o cliente/anunciante responsavel.
- Cadastrar o MikroTik em `/dashboard/mikrotiks`.
- Conferir variaveis da VPS em `/dashboard/operacao`.
- Confirmar que `Control API remota` esta OK.
- Se o ponto for Pix ou Hibrido, cadastrar pelo menos um plano ativo em `/dashboard/wifi-pix` antes de alterar o modo.

## 2. Topologia recomendada

```txt
ONT/ONU do provedor > ether1 MikroTik > LAN/PoE > Access Point > Usuario
```

- A entrada de internet fica na `ether1` do MikroTik.
- O Access Point deve operar em bridge/AP, sem NAT proprio.
- Os clientes devem receber IP da rede do hotspot, normalmente `192.168.88.0/24`.
- Se usar Ruijie, manter SSID aberto e modo bridge/mesma VLAN do AP.

## 3. MikroTik

- Hotspot server padrao: `hotspot1`.
- Gateway hotspot comum: `192.168.88.1/24`.
- Sub-rede comum: `192.168.88.0/24`.
- DNS no MikroTik habilitado com `allow-remote-requests=yes`.
- Usuario da API: `nexawi_api` com senha forte.
- Acesso remoto preferencial via WireGuard/VPN para a VPS.

Validar no painel:

1. Abrir `/dashboard/mikrotiks`.
2. Rodar diagnostico do MikroTik.
3. Esperado: `MikroTik pronto para operar`.
4. Verificar se o hotspot server detectado e o cadastrado sao o mesmo.

## 4. Aplicar portal e politica

1. Abrir `/dashboard/rede`.
2. Selecionar hotspot correto.
3. Clicar em `Configurar Portal Cativo`.
4. Clicar em `Aplicar Politica`.
5. Confirmar que nao existem regras invalidas.

## 5. Teste real no celular

- Esquecer a rede Wi-Fi antes do teste.
- Desativar MAC aleatorio se quiser validar reconhecimento recorrente do mesmo aparelho.
- Conectar no SSID aberto.
- Confirmar que o portal abre em ate poucos segundos.
- Fazer cadastro com telefone e LGPD.
- Assistir anuncio ate liberar CTA.
- Testar `Nao, seguir para Wi-Fi`.
- Confirmar no MikroTik:

```routeros
/ip hotspot ip-binding print detail where mac-address=<MAC>
/ip hotspot host print detail where mac-address=<MAC>
/queue simple print detail
```

Resultado esperado:

- IP binding `type=bypassed` para o MAC testado.
- Host com IP na faixa do hotspot.
- Queue com limite configurado para o cliente.
- Internet liberada rapidamente apos a regra do portal.

## 6. Alertas que impedem producao

- `/dashboard/operacao` com Control API em erro.
- Hotspot Pix/Hibrido sem plano ativo.
- MikroTik sem WireGuard ou sem REST/www acessivel pela VPS.
- AP em modo roteador/NAT em vez de bridge.
- Cliente recebendo IP fora da sub-rede esperada do hotspot.
- Walled garden sem `www.nexawi.com.br` e dominios necessarios do pagamento.

## 7. Depois do teste

- Criar ou vincular anuncio ativo ao hotspot.
- Conferir `/dashboard/relatorios/acesso` apos primeiro acesso.
- Conferir leads capturados.
- Se for Pix/Hibrido, testar pagamento em ambiente sandbox/producao conforme gateway ativo.