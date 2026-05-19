# Manual MikroTik NexaWi

Este manual descreve o padrao para preparar um MikroTik novo para operar com a NexaWi Ads.

Use os comandos com cuidado. Troque todos os placeholders antes de colar no RouterOS. Nunca reutilize private key, senha ou IP VPN entre roteadores.

## 1. Padrao Validado

```txt
VPS publica: 207.244.230.147
VPS WireGuard: 10.70.0.1
MikroTik WireGuard: 10.70.0.X
RouterOS REST: http://10.70.0.X/rest
Hotspot server: hotspot1
Interface hotspot: bridge
Gateway hotspot: 192.168.88.1/24
Sub-rede hotspot: 192.168.88.0/24
Usuario API: nexawi_api
```

`10.70.0.X` e IP privado da VPN WireGuard. Nao e IP publico.

## 2. Bootstrap Basico

Crie uma bridge para a rede local/hotspot.

```routeros
/interface bridge add name=bridge comment="NexaWi hotspot bridge"
```

Adicione portas LAN na bridge. Ajuste as interfaces conforme o equipamento.

```routeros
/interface bridge port add bridge=bridge interface=ether2
/interface bridge port add bridge=bridge interface=ether3
/interface bridge port add bridge=bridge interface=ether4
```

Configure IP gateway do hotspot.

```routeros
/ip address add address=192.168.88.1/24 interface=bridge comment="NexaWi hotspot gateway"
```

Configure WAN com DHCP client na porta de internet.

```routeros
/ip dhcp-client add interface=ether1 disabled=no comment="NexaWi WAN"
```

Crie pool DHCP para clientes do hotspot.

```routeros
/ip pool add name=nexawi-hotspot-pool ranges=192.168.88.10-192.168.88.254
```

Crie DHCP server.

```routeros
/ip dhcp-server add name=nexawi-dhcp interface=bridge address-pool=nexawi-hotspot-pool disabled=no
/ip dhcp-server network add address=192.168.88.0/24 gateway=192.168.88.1 dns-server=192.168.88.1
```

Ative DNS no MikroTik.

```routeros
/ip dns set allow-remote-requests=yes servers=1.1.1.1,8.8.8.8
```

Crie NAT para internet.

```routeros
/ip firewall nat add chain=srcnat action=masquerade out-interface=ether1 comment="NexaWi WAN masquerade"
```

## 3. Hotspot

Crie perfil do hotspot. Ajuste `html-directory` se usar arquivos locais do RouterOS.

```routeros
/ip hotspot profile add name=hsprof1 hotspot-address=192.168.88.1 dns-name=wifi.nexawi.com.br html-directory=hotspot login-by=http-chap,http-pap
```

Crie o hotspot server padrao.

```routeros
/ip hotspot add name=hotspot1 interface=bridge address-pool=nexawi-hotspot-pool profile=hsprof1 disabled=no
```

Crie um usuario local de emergencia para teste. Nao use como fluxo comercial.

```routeros
/ip hotspot user add name=teste password=teste server=hotspot1 comment="NexaWi teste local"
```

## 4. Portal / Walled Garden

Permita acesso aos dominios essenciais da NexaWi antes do login.

```routeros
/ip hotspot walled-garden add dst-host=www.nexawi.com.br comment="NexaWi portal"
/ip hotspot walled-garden add dst-host=nexawi.com.br comment="NexaWi portal"
/ip hotspot walled-garden add dst-host=*.supabase.co comment="NexaWi Supabase"
/ip hotspot walled-garden add dst-host=*.vercel.app comment="NexaWi Vercel"
```

Se usar dominio dedicado no futuro, adicione:

```routeros
/ip hotspot walled-garden add dst-host=wifi.nexawi.com.br comment="NexaWi captive portal"
```

## 5. Usuario Da Control API

Crie usuario usado pela plataforma. Use senha forte e salve no painel/VPS.

```routeros
/user add name=nexawi_api group=full password="<SENHA_FORTE_AQUI>" comment="NexaWi Control API"
```

Ative REST via servico `www`, restrito ao IP da VPS na VPN.

```routeros
/ip service set www disabled=no port=80 address=10.70.0.1/32
```

Opcionalmente restrinja WinBox e SSH tambem.

```routeros
/ip service set winbox address=10.70.0.1/32
/ip service set ssh address=10.70.0.1/32
```

Desative servicos que nao forem usados.

```routeros
/ip service set telnet disabled=yes
/ip service set ftp disabled=yes
/ip service set api-ssl disabled=yes
```

## 6. WireGuard

Crie uma private key unica para cada MikroTik fora deste manual. Nao reutilize.

```routeros
/interface wireguard add name=wg-nexawi mtu=1420 listen-port=51820 private-key="<PRIVATE_KEY_DO_MIKROTIK>"
```

Adicione o IP VPN do MikroTik. Troque `10.70.0.X` pelo proximo IP livre.

```routeros
/ip address add address=10.70.0.X/24 interface=wg-nexawi comment="NexaWi VPN"
```

Adicione a VPS como peer.

```routeros
/interface wireguard peers add interface=wg-nexawi public-key="<PUBLIC_KEY_DA_VPS>" endpoint-address=207.244.230.147 endpoint-port=51820 allowed-address=10.70.0.1/32 persistent-keepalive=25s comment="NexaWi VPS"
```

Valide handshake.

```routeros
/interface wireguard peers print detail
```

O campo `last-handshake` deve aparecer recente.

## 7. Cadastro No Painel NexaWi

No painel, cadastre o MikroTik com:

```txt
Nome: MikroTik <cidade/local> 01
Base URL: http://10.70.0.X
Usuario: nexawi_api
Senha: <SENHA_FORTE_AQUI>
Hotspot Server: hotspot1
Status: Ativo
```

Depois rode:

```txt
Dashboard > MikroTiks > Diagnostico
```

O resultado esperado e `MikroTik pronto para operar`.

## 8. Politica NexaWi Aplicada Pelo Painel

O painel cria e remove regras com comentarios iniciando por `NEXAWI_`.

Forcar DNS para o MikroTik:

```routeros
/ip firewall nat add chain=dstnat action=redirect to-ports=53 protocol=udp src-address=192.168.88.0/24 dst-port=53 comment="NEXAWI_FORCE_DNS_UDP"
/ip firewall nat add chain=dstnat action=redirect to-ports=53 protocol=tcp src-address=192.168.88.0/24 dst-port=53 comment="NEXAWI_FORCE_DNS_TCP"
```

Bloquear DNS over TLS:

```routeros
/ip firewall filter add chain=forward action=drop protocol=tcp src-address=192.168.88.0/24 dst-port=853 comment="NEXAWI_BLOCK_DOT_TCP"
/ip firewall filter add chain=forward action=drop protocol=udp src-address=192.168.88.0/24 dst-port=853 comment="NEXAWI_BLOCK_DOT_UDP"
```

Bloquear QUIC/HTTP3:

```routeros
/ip firewall filter add chain=forward action=drop protocol=udp src-address=192.168.88.0/24 dst-port=443 comment="NEXAWI_BLOCK_QUIC_UDP_443"
```

Bloquear torrent:

```routeros
/ip firewall filter add chain=forward action=drop protocol=tcp src-address=192.168.88.0/24 dst-port=6881-6999,51413,6969 comment="NEXAWI_BLOCK_TORRENT_TCP"
/ip firewall filter add chain=forward action=drop protocol=udp src-address=192.168.88.0/24 dst-port=6881-6999,51413,6969 comment="NEXAWI_BLOCK_TORRENT_UDP"
```

Bloquear jogos pesados:

```routeros
/ip firewall filter add chain=forward action=drop protocol=udp src-address=192.168.88.0/24 dst-port=3074,3478-3480,3659,4380,7777-7790,27000-27200 comment="NEXAWI_BLOCK_GAMES_UDP"
/ip firewall filter add chain=forward action=drop protocol=tcp src-address=192.168.88.0/24 dst-port=3074,27014-27050 comment="NEXAWI_BLOCK_GAMES_TCP"
```

Bloqueio por dominio via DNS:

```routeros
/ip dns static add regexp="(^|.*\.)instagram\.com$" type=NXDOMAIN comment="NEXAWI_DNS_BLOCK_CUSTOM_INSTAGRAM_COM" disabled=no
```

Fallback se regexp/NXDOMAIN nao for aceito:

```routeros
/ip dns static add name=instagram.com type=A address=0.0.0.0 comment="NEXAWI_DNS_BLOCK_CUSTOM_INSTAGRAM_COM" disabled=no
/ip dns static add name=www.instagram.com type=A address=0.0.0.0 comment="NEXAWI_DNS_BLOCK_CUSTOM_WWW_INSTAGRAM_COM" disabled=no
```

## 9. Presets De Bloqueio

O painel pode aplicar presets fortes pelo menu Controle de Rede.
O operador marca um gatilho simples no painel e a Control API expande para dominios,
TLS hosts, DNS static, bloqueio de DoH, bloqueio de QUIC e, quando necessario,
address-list no MikroTik.

Presets disponiveis:

| Preset | Gatilho no painel | Cobertura aplicada pela Control API |
| --- | --- | --- |
| Facebook / Meta | `facebook.com` | Facebook, Messenger, CDNs Meta e blocos de IP conhecidos da Meta |
| Instagram | `instagram.com` | Instagram, CDN Instagram, Threads e infraestrutura compartilhada Meta |
| TikTok | `tiktok.com` | TikTok, CDNs, APIs, imagens e entrega de video ByteDance |
| YouTube | `youtube.com` | YouTube, YouTube Kids, Shorts, thumbnails, APIs e Googlevideo |
| Streaming | `netflix.com` | Netflix, Prime Video, Disney+, Max, Globoplay, Twitch, Pluto TV e Paramount+ |
| Apostas | `bet365.com`, `betano.com`, `betfair.com`, `stake.com`, `blaze.com` | Bets populares no Brasil, cassino, odds e dominios relacionados |
| Adulto / pornografia | `pornhub.com`, `xvideos.com`, `xnxx.com`, `onlyfans.com` | Sites adultos, webcams, conteudo pago e redes populares |
| Jogos pesados | `roblox.com`, `epicgames.com`, `steampowered.com`, `riotgames.com` | Roblox, Steam, Epic, Fortnite, Riot, Xbox e PlayStation |

Observacoes:

- Sites permitidos sempre vencem sites bloqueados.
- Se um dominio permitido usa infraestrutura Meta/Instagram, o painel evita aplicar bloqueio forte por IP da Meta para nao derrubar o permitido.
- Os presets dependem de DNS forçado para maior efetividade.
- O bloqueio QUIC melhora o controle de apps que tentam escapar por UDP/443.

## 10. Liberacao De Cliente Do Portal

Depois que o usuario preenche o portal, aceita LGPD e assiste ao anuncio, a plataforma pode liberar o dispositivo.

IP binding bypass:

```routeros
/ip hotspot ip-binding add mac-address=<MAC_DO_CLIENTE> server=hotspot1 type=bypassed disabled=no comment="<COMENTARIO_DA_SESSAO_NEXAWI>"
```

Queue de velocidade:

```routeros
/queue simple add name=nexawi-client-<MAC_SEM_DOIS_PONTOS> target=<IP_DO_CLIENTE>/32 max-limit=2M/5M comment="nexawi_client:<MAC_DO_CLIENTE>" disabled=no
```

Padrao atual:

```txt
Upload: 2M
Download: 5M
```

## 11. Reset Da Politica NexaWi

Remove regras criadas pela NexaWi. Use apenas pelo painel ou com seguranca.

```routeros
/ip firewall filter remove [find where comment~"^NEXAWI_"]
/ip firewall nat remove [find where comment~"^NEXAWI_"]
/ip dns static remove [find where comment~"^NEXAWI_"]
/ip firewall address-list remove [find where comment~"^NEXAWI_"]
```

## 12. Validacao Final

Na VPS:

```bash
cd /srv/nexawi/control-api

node -e "require('dotenv').config({path:'.env'}); const user=process.env.ROUTEROS_USERNAME; const pass=process.env.ROUTEROS_PASSWORD; const base=(process.env.ROUTEROS_BASE_URL||'http://10.70.0.2').replace(/\/$/,''); const basic=Buffer.from(user+':'+pass).toString('base64'); fetch(base+'/rest/system/resource',{headers:{Authorization:'Basic '+basic}}).then(async r=>console.log(r.status, await r.text())).catch(e=>console.error(e.message))"
```

Esperado: `200` com JSON do RouterOS.

No painel:

```txt
1. Dashboard > MikroTiks > Diagnostico
2. Dashboard > Controle de Rede > Atualizar Status
3. Aplicar politica
4. Bloquear dominio de teste
5. Testar no celular
6. Desbloquear dominio
7. Confirmar acesso liberado
```

## 13. Checklist De Campo

```txt
[ ] WAN com internet
[ ] Bridge criada
[ ] DHCP ativo
[ ] DNS ativo
[ ] NAT masquerade ativo
[ ] hotspot1 ativo
[ ] Portal permitido no walled garden
[ ] nexawi_api criado
[ ] WireGuard rodando
[ ] last-handshake recente
[ ] REST restrito ao IP da VPS/VPN
[ ] MikroTik cadastrado no painel
[ ] Diagnostico sem criticos
[ ] Politica aplicada
[ ] Bloqueio/desbloqueio testado no celular
```
