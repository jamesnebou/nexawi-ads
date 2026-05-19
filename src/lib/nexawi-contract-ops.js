// src/lib/nexawi-contract-ops.js

function limpar(value = '') {
  return String(value || '').trim()
}

export function isValidEmail(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpar(value))
}

export function validateContractFields(fields = {}) {
  const errors = []
  const c = fields.contratante || {}
  const p = fields.plano || {}
  const cond = fields.condicoes || {}

  if (!limpar(c.nome_razao_social)) errors.push('Nome/Razão Social do cliente não informado.')
  if (!limpar(c.cpf_cnpj)) errors.push('CPF/CNPJ do cliente não informado.')
  if (!limpar(c.email)) errors.push('E-mail do cliente não informado.')
  if (limpar(c.email) && !isValidEmail(c.email)) errors.push('E-mail do cliente inválido.')
  if (!limpar(c.telefone)) errors.push('Telefone do cliente não informado.')
  if (!limpar(c.nome_responsavel)) errors.push('Nome do responsável não informado.')
  if (!limpar(p.nome)) errors.push('Plano contratado não informado.')
  if (Number(p.valor_mensal || 0) <= 0) errors.push('Valor mensal do contrato está zerado ou inválido.')
  if (!limpar(p.data_inicio)) errors.push('Data de início não informada.')
  if (!limpar(p.data_termino)) errors.push('Data de término não informada.')
  if (!limpar(cond.foro)) errors.push('Foro não informado.')

  return { ok: errors.length === 0, errors }
}
