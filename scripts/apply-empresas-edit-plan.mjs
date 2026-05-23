import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n')
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content.replace(/\r\n/g, '\n'))
}

function replaceOnce(content, search, replacement, label) {
  if (!content.includes(search)) {
    throw new Error(`Trecho nao encontrado: ${label}`)
  }
  return content.replace(search, replacement)
}

function patchApiEmpresas() {
  const file = 'src/app/api/admin/empresas/route.js'
  let content = read(file)

  if (!content.includes('async function carregarPlanos')) {
    content = replaceOnce(
      content,
      "function limparUuid(value = '') {\n  const text = limparTexto(value)\n  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)\n    ? text\n    : ''\n}\n",
      "function limparUuid(value = '') {\n  const text = limparTexto(value)\n  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)\n    ? text\n    : ''\n}\n\nasync function carregarPlanos() {\n  const { data, error } = await supabaseAdmin\n    .from('planos')\n    .select('id, nome, preco, max_criativos, ciclo_cobranca')\n    .order('preco', { ascending: true })\n\n  if (error) throw error\n  return data || []\n}\n",
      'api: carregar planos'
    )
  }

  content = content.replace(
    'planos(nome, preco)',
    'planos(id, nome, preco, max_criativos, ciclo_cobranca)'
  )

  if (!content.includes('const [{ data, error }, planos] = await Promise.all([')) {
    content = replaceOnce(
      content,
      "    const { data, error } = await query\n    if (error) throw error",
      "    const [{ data, error }, planos] = await Promise.all([\n      query,\n      carregarPlanos(),\n    ])\n\n    if (error) throw error",
      'api: carregar empresas e planos'
    )
  }

  if (!content.includes('planos,\n      },')) {
    content = replaceOnce(
      content,
      "      options: {\n        status: STATUS_EMPRESA,\n        roles: ROLES_EMPRESA,\n      },",
      "      options: {\n        status: STATUS_EMPRESA,\n        roles: ROLES_EMPRESA,\n        planos,\n      },",
      'api: retornar planos'
    )
  }

  const patchPayloadCreate = "      cliente_id: limparUuid(body.cliente_id) || null,\n      plano_id: limparUuid(body.plano_id) || null,"
  if (!content.includes(patchPayloadCreate)) {
    content = replaceOnce(
      content,
      "      cliente_id: limparUuid(body.cliente_id) || null,",
      patchPayloadCreate,
      'api: plano create'
    )
  }

  const patchPayloadUpdate = "      plano_id: limparUuid(body.plano_id) || null,\n      nome_empresa: limparTexto(body.nome_empresa),"
  if (!content.includes(patchPayloadUpdate)) {
    content = replaceOnce(
      content,
      "      nome_empresa: limparTexto(body.nome_empresa),",
      patchPayloadUpdate,
      'api: plano update'
    )
  }

  write(file, content)
}

function patchPageEmpresas() {
  const file = 'src/app/dashboard/empresas/page.js'
  let content = read(file)

  if (!content.includes('useRef')) {
    content = content.replace("import { useEffect, useMemo, useState } from 'react'", "import { useEffect, useMemo, useRef, useState } from 'react'")
  }

  if (!content.includes("plano_id: ''")) {
    content = replaceOnce(
      content,
      "  status: 'ativo',\n}",
      "  status: 'ativo',\n  plano_id: '',\n}",
      'page: empty plano'
    )
  }

  if (!content.includes('function planoLabel')) {
    content = replaceOnce(
      content,
      "function roleLabel(role) {\n  return roleOptions.find((item) => item.value === role)?.label || role || 'Viewer'\n}\n",
      "function roleLabel(role) {\n  return roleOptions.find((item) => item.value === role)?.label || role || 'Viewer'\n}\n\nfunction planoLabel(plano) {\n  if (!plano) return 'Sem plano definido'\n  const max = Number(plano.max_criativos || 0)\n  return `${plano.nome}${max ? ` · ${max} criativo${max > 1 ? 's' : ''}` : ''}`\n}\n",
      'page: plano label'
    )
  }

  if (!content.includes('const [planos, setPlanos]')) {
    content = replaceOnce(
      content,
      "  const [permissions, setPermissions] = useState({})\n",
      "  const [permissions, setPermissions] = useState({})\n  const [planos, setPlanos] = useState([])\n",
      'page: planos state'
    )
  }

  if (!content.includes('const editorRef = useRef(null)')) {
    content = replaceOnce(
      content,
      "  const [usuarioForm, setUsuarioForm] = useState(emptyUsuario)\n",
      "  const [usuarioForm, setUsuarioForm] = useState(emptyUsuario)\n  const editorRef = useRef(null)\n",
      'page: editor ref'
    )
  }

  if (!content.includes('editorRef.current?.scrollIntoView')) {
    content = replaceOnce(
      content,
      "  useEffect(() => {\n    carregar()\n  }, [status])\n",
      "  useEffect(() => {\n    carregar()\n  }, [status])\n\n  useEffect(() => {\n    if (!editingId || !editorRef.current) return\n    window.setTimeout(() => {\n      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })\n    }, 80)\n  }, [editingId])\n",
      'page: scroll edit'
    )
  }

  if (!content.includes('setPlanos(data.options?.planos')) {
    content = replaceOnce(
      content,
      "      setPermissions(data.permissions || {})\n",
      "      setPermissions(data.permissions || {})\n      setPlanos(data.options?.planos || [])\n",
      'page: set planos'
    )
  }

  if (!content.includes('plano_id: empresa.plano_id')) {
    content = replaceOnce(
      content,
      "      status: empresa.status || 'ativo',\n    })",
      "      status: empresa.status || 'ativo',\n      plano_id: empresa.plano_id || '',\n    })",
      'page: edit plano'
    )
  }

  if (!content.includes('planos={planos}')) {
    content = replaceOnce(
      content,
      "          <EmpresaForm\n            form={empresaForm}",
      "          <div ref={editorRef}>\n            <EmpresaForm\n            form={empresaForm}",
      'page: wrap ref open'
    )
    content = replaceOnce(
      content,
      "            title={editingId === 'nova' ? 'Nova empresa' : 'Editar empresa'}\n          />",
      "            title={editingId === 'nova' ? 'Nova empresa' : 'Editar empresa'}\n            planos={planos}\n          />\n          </div>",
      'page: pass planos close'
    )
  }

  content = content.replace(
    'function EmpresaForm({ title, form, setForm, onSubmit, onClose, saving })',
    'function EmpresaForm({ title, form, setForm, onSubmit, onClose, saving, planos = [] })'
  )

  if (!content.includes('FieldSelect label="Plano"')) {
    content = replaceOnce(
      content,
      "        <FieldInput label=\"Telefone\" value={form.telefone} onChange={(value) => setForm((current) => ({ ...current, telefone: value }))} />",
      "        <FieldInput label=\"Telefone\" value={form.telefone} onChange={(value) => setForm((current) => ({ ...current, telefone: value }))} />\n        <FieldSelect label=\"Plano\" value={form.plano_id} onChange={(value) => setForm((current) => ({ ...current, plano_id: value }))} options={[{ value: '', label: 'Sem plano definido' }, ...planos.map((plano) => ({ value: plano.id, label: planoLabel(plano) }))]} />",
      'page: campo plano'
    )
  }

  if (!content.includes('{planoLabel(empresa.planos)}')) {
    content = replaceOnce(
      content,
      "          <p className=\"text-xs text-neutral-600 mt-1\">{empresa.cidade || 'Cidade não informada'} {empresa.estado ? `/${empresa.estado}` : ''}</p>",
      "          <p className=\"text-xs text-neutral-600 mt-1\">{empresa.cidade || 'Cidade não informada'} {empresa.estado ? `/${empresa.estado}` : ''}</p>\n          <p className=\"mt-3 inline-flex rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-[11px] font-bold text-neutral-300\">\n            {planoLabel(empresa.planos)}\n          </p>",
      'page: mostrar plano card'
    )
  }

  content = content.replace('<button onClick={onEdit} className=', '<button type="button" onClick={onEdit} className=')

  write(file, content)
}

try {
  patchApiEmpresas()
  patchPageEmpresas()
  console.log('Patch de edição/plano de empresas aplicado com sucesso.')
} catch (error) {
  console.error(error)
  process.exit(1)
}
