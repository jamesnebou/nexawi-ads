# Checklist de nova cidade NexaWi

Este checklist serve para abrir uma nova cidade sem pular etapas comerciais,
tecnicas, LGPD, portal cativo, MikroTik, controle de rede e relatorios.

No painel, use:

```txt
/dashboard/cidades/checklist
```

## 1. Comercial e contrato

- Cliente, cidade e responsavel comercial definidos.
- Plano, valor, prazo e escopo de midia local definidos.
- Contrato gerado, enviado e vinculado ao cliente.

## 2. Landing da cidade

- Cidade cadastrada em `/dashboard/cidades`.
- Slug, headline, CTA, WhatsApp, precos e imagem conferidos.
- Pagina publica da cidade testada no desktop e no celular.

## 3. Hotspot e local

- Hotspot/local cadastrado em `/dashboard/hotspots`.
- Nome, cidade, endereco/regiao, status e slug do portal conferidos.
- Hotspot vinculado ao MikroTik correto.

## 4. MikroTik remoto

- WireGuard configurado.
- Handshake recente validado.
- RouterOS REST validado pela VPS.
- Hotspot server, bridge e sub-rede conferidos.
- Manual de referencia: `docs/manual-mikrotik-nexawi.md`.

## 5. Portal cativo

- Formulario exige nome, e-mail, telefone, CPF e aceite LGPD.
- Anuncio obrigatorio aparece antes da liberacao.
- CTA funciona.
- Mensagem de inatividade/expiracao revisada.

## 6. Controle de rede

- Presets fortes selecionados.
- Politica aplicada no MikroTik real.
- Bloqueio e desbloqueio testados no celular sem cabo fisico.
- Regras DNS, filter e NAT conferidas no painel.

## 7. Campanhas e relatorios

- Campanha vinculada ao cliente/anunciante e ao hotspot.
- Lead, impressao e clique de teste registrados.
- Relatorio comercial revisado.

## 8. Go-live

- Teste final feito no celular: portal, anuncio, CTA e internet.
- IPs, usuario tecnico e dados de acesso guardados em local seguro.
- Equipe avisada que a cidade esta pronta para vender e operar.
