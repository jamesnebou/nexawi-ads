alter table public.wifi_pix_vendas
  add column if not exists cpf_cnpj text;

comment on column public.wifi_pix_vendas.cpf_cnpj is
  'CPF ou CNPJ informado pelo pagador para criacao segura da cobranca no Asaas.';
