import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content)
}

function replaceOnce(content, search, replacement, label) {
  if (!content.includes(search)) {
    throw new Error(`Trecho nao encontrado para patch: ${label}`)
  }
  return content.replace(search, replacement)
}

function replaceRegex(content, regex, replacement, label) {
  const next = content.replace(regex, replacement)
  if (next === content) {
    throw new Error(`Trecho nao encontrado para patch: ${label}`)
  }
  return next
}

function insertAfterUrlDestinoSelects(content) {
  return content.replace(
    /(\n\s*)url_destino,\n(?!\s*tipo_destino,)/g,
    '$1url_destino,\n$1tipo_destino,\n$1lp_slug,\n$1tempo_liberacao_lp,\n'
  )
}

function patchAdminAnunciosRoute() {
  const file = 'src/app/api/admin/anuncios/route.js'
  let content = read(file)

  if (!content.includes("const TIPOS_DESTINO_VALIDOS")) {
    content = replaceOnce(
      content,
      "const TIPOS_MIDIA_VALIDOS = ['imagem', 'video']",
      "const TIPOS_MIDIA_VALIDOS = ['imagem', 'video']\nconst TIPOS_DESTINO_VALIDOS = ['externo', 'lp_interna']",
      'admin: tipos destino'
    )
  }

  if (!content.includes('tipo_destino: TIPOS_DESTINO_VALIDOS.includes')) {
    content = replaceOnce(
      content,
      "    url_destino: limparTexto(anuncio.url_destino),",
      "    url_destino: limparTexto(anuncio.url_destino),\n    tipo_destino: TIPOS_DESTINO_VALIDOS.includes(anuncio.tipo_destino)\n      ? anuncio.tipo_destino\n      : 'externo',\n    lp_slug: limparTexto(anuncio.lp_slug),\n    tempo_liberacao_lp: Number.isFinite(Number(anuncio.tempo_liberacao_lp))\n      ? Math.min(60, Math.max(3, Number(anuncio.tempo_liberacao_lp)))\n      : 10,",
      'admin: sanitizar payload destino'
    )
  }

  if (!content.includes("if (payload.tipo_destino === 'lp_interna' && !payload.lp_slug)")) {
    content = replaceOnce(
      content,
      "  if (!payload.cliente_id) return 'Cliente responsável é obrigatório'\n\n  if (!Array.isArray(hotspotIds) || hotspotIds.length === 0) {",
      "  if (!payload.cliente_id) return 'Cliente responsável é obrigatório'\n  if (payload.tipo_destino === 'externo' && !payload.url_destino) {\n    return 'Link externo é obrigatório para campanhas com destino externo'\n  }\n  if (payload.tipo_destino === 'lp_interna' && !payload.lp_slug) {\n    return 'Selecione uma LP interna para este anúncio'\n  }\n\n  if (!Array.isArray(hotspotIds) || hotspotIds.length === 0) {",
      'admin: validar destino'
    )
  }

  content = insertAfterUrlDestinoSelects(content)

  if (!content.includes('tipo_destino_atual')) {
    content = replaceOnce(
      content,
      "        tipo_media_anterior: anuncioAntes?.tipo_media || null,\n        tipo_media_atual: anuncioAtual?.tipo_media || payload.tipo_media,\n        ativo_anterior:",
      "        tipo_media_anterior: anuncioAntes?.tipo_media || null,\n        tipo_media_atual: anuncioAtual?.tipo_media || payload.tipo_media,\n        tipo_destino_anterior: anuncioAntes?.tipo_destino || 'externo',\n        tipo_destino_atual: anuncioAtual?.tipo_destino || payload.tipo_destino,\n        lp_slug_anterior: anuncioAntes?.lp_slug || null,\n        lp_slug_atual: anuncioAtual?.lp_slug || payload.lp_slug || null,\n        ativo_anterior:",
      'admin: auditoria destino'
    )
  }

  write(file, content)
}

function patchDashboardAnunciosPage() {
  const file = 'src/app/dashboard/anuncios/page.js'
  let content = read(file)

  if (!content.includes("tipo_destino: 'externo'")) {
    content = content.replace(
      /(\n\s*)url_destino: '',\n(?!\s*tipo_destino:)/g,
      "$1url_destino: '',\n$1tipo_destino: 'externo',\n$1lp_slug: '',\n$1tempo_liberacao_lp: 10,\n"
    )
  }

  if (!content.includes("tipo_destino: anuncio.tipo_destino")) {
    content = replaceOnce(
      content,
      "        url_destino: anuncio.url_destino || '',",
      "        url_destino: anuncio.url_destino || '',\n        tipo_destino: anuncio.tipo_destino || 'externo',\n        lp_slug: anuncio.lp_slug || '',\n        tempo_liberacao_lp: anuncio.tempo_liberacao_lp || 10,",
      'dashboard: form editar destino'
    )
  }

  if (!content.includes("form.tipo_destino === 'externo'")) {
    content = replaceOnce(
      content,
      "    if (!form.titulo.trim() || !selectedClientInModal || selectedHotspotIds.length === 0) {\n      alert('Por favor, preencha todos os campos obrigatórios: Título, Cliente e selecione pelo menos um Hotspot.')\n      return\n    }",
      "    if (!form.titulo.trim() || !selectedClientInModal || selectedHotspotIds.length === 0) {\n      alert('Por favor, preencha todos os campos obrigatórios: Título, Cliente e selecione pelo menos um Hotspot.')\n      return\n    }\n\n    if (form.tipo_destino === 'externo' && !form.url_destino.trim()) {\n      alert('Informe o link externo do CTA.')\n      return\n    }\n\n    if (form.tipo_destino === 'lp_interna' && !form.lp_slug.trim()) {\n      alert('Informe o slug da LP interna. Exemplo: lp-evento')\n      return\n    }",
      'dashboard: validar destino'
    )
  }

  if (!content.includes('Tipo de Destino do CTA')) {
    const oldBlockRegex = /              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">\n                <div>\n                  <label className="text-xs font-bold text-gray-500 mb-3 block uppercase tracking-widest">\n                    Link de Destino \(CTA\)\n                  <\/label>\n                  <input\n                    type="url"\n                    placeholder="https:\/\/seusite\.com\.br"\n                    value=\{form\.url_destino\}\n                    onChange=\{\(e\) => setForm\(\{ \.\.\.form, url_destino: e\.target\.value \}\)\}\n                    className="w-full bg-\[#050505\] border border-white\/\[0\.05\] rounded-2xl px-5 py-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-\[#6be12f\]\/30 focus:ring-1 focus:ring-\[#6be12f\]\/30 transition-all shadow-inner"\n                  \/>\n                <\/div>\n\n                <div className="flex items-center mt-7">/

    const newBlock = `              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-3 block uppercase tracking-widest">
                    Tipo de Destino do CTA
                  </label>
                  <select
                    value={form.tipo_destino}
                    onChange={(e) => setForm({
                      ...form,
                      tipo_destino: e.target.value,
                    })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-[#6be12f]/30 focus:ring-1 focus:ring-[#6be12f]/30 transition-all shadow-inner appearance-none"
                  >
                    <option value="externo" className="bg-[#050505]">Link externo: libera internet e abre fora</option>
                    <option value="lp_interna" className="bg-[#050505]">LP interna NexaWi: abre LP e libera após 10s</option>
                  </select>
                </div>

                {form.tipo_destino === 'externo' ? (
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-3 block uppercase tracking-widest">
                      Link Externo (CTA)
                    </label>
                    <input
                      type="url"
                      placeholder="https://seusite.com.br"
                      value={form.url_destino}
                      onChange={(e) => setForm({ ...form, url_destino: e.target.value })}
                      className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#6be12f]/30 focus:ring-1 focus:ring-[#6be12f]/30 transition-all shadow-inner"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-3 block uppercase tracking-widest">
                      Slug da LP interna
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: lp-evento"
                      value={form.lp_slug}
                      onChange={(e) => setForm({ ...form, lp_slug: e.target.value })}
                      className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#6be12f]/30 focus:ring-1 focus:ring-[#6be12f]/30 transition-all shadow-inner"
                    />
                    <p className="mt-2 text-[11px] leading-relaxed text-gray-600">
                      Exemplo: www.nexawi.com.br/lp/lp-evento. O Wi-Fi só será liberado depois de 10 segundos na LP.
                    </p>
                  </div>
                )}

                <div className="flex items-center mt-7">`

    content = replaceRegex(content, oldBlockRegex, newBlock, 'dashboard: bloco destino CTA')
  }

  write(file, content)
}

function patchPortalPage() {
  const file = 'src/app/portal/[slug]/page.js'
  let content = read(file)

  if (!content.includes('function montarUrlLpInterna')) {
    content = replaceOnce(
      content,
      "function normalizarUrlDestino(url = '') {",
      "function montarUrlLpInterna(anuncio = {}, contexto = {}) {\n  const lpSlug = String(anuncio.lp_slug || '').trim()\n\n  if (!lpSlug) return ''\n\n  const params = new URLSearchParams({\n    pendingAuth: '1',\n    hotspotSlug: contexto.hotspotSlug || '',\n    leadId: contexto.leadId || '',\n    clientMac: contexto.clientMac || '',\n    clientIp: contexto.clientIp || '',\n    anuncioId: anuncio.id || '',\n  })\n\n  return `/lp/${encodeURIComponent(lpSlug)}?${params.toString()}`\n}\n\nfunction normalizarUrlDestino(url = '') {",
      'portal: helper LP interna'
    )
  }

  if (!content.includes('const tipoDestino = anuncioAtual?.tipo_destino ||')) {
    content = replaceOnce(
      content,
      "      if (clicou && anuncioAtual) {\n        const urlNormalizada = normalizarUrlDestino(destinoExterno || anuncioAtual.url_destino || '')",
      "      if (clicou && anuncioAtual) {\n        const tipoDestino = anuncioAtual?.tipo_destino || 'externo'\n        const urlNormalizada = tipoDestino === 'lp_interna'\n          ? montarUrlLpInterna(anuncioAtual, {\n              hotspotSlug: hotspot?.slug || slug,\n              leadId: resolvedLeadId || '',\n              clientMac: getClientMac(),\n              clientIp: getClientIp(),\n            })\n          : normalizarUrlDestino(destinoExterno || anuncioAtual.url_destino || '')",
      'portal: escolher URL destino'
    )
  }

  if (!content.includes('Destino interno NexaWi')) {
    content = replaceOnce(
      content,
      "        // No Android, liberar imediatamente fecha o captive portal.\n        // Por isso primeiro mostramos a tela de copiar/abrir oferta e só liberamos após 5s.\n        setEtapa(ETAPAS.ABRIR_CLIENTE)\n        liberarInternetAposDelay(resolvedLeadId, 5000)\n        return",
      "        if (tipoDestino === 'lp_interna') {\n          // Destino interno NexaWi: ainda nao libera no portal.\n          // A LP abre dentro do dominio liberado no Walled Garden e libera o Wi-Fi apos 10s.\n          window.location.href = urlNormalizada\n          return\n        }\n\n        // No Android, liberar imediatamente fecha o captive portal.\n        // Por isso primeiro mostramos a tela de copiar/abrir oferta e só liberamos após 5s.\n        setEtapa(ETAPAS.ABRIR_CLIENTE)\n        liberarInternetAposDelay(resolvedLeadId, 5000)\n        return",
      'portal: fluxo LP interna'
    )
  }

  if (!content.includes("anuncioAtual.tipo_destino === 'lp_interna'")) {
    content = replaceOnce(
      content,
      "                {anuncioAtual.url_destino && (\n                  <button",
      "                {(anuncioAtual.url_destino || anuncioAtual.tipo_destino === 'lp_interna') && (\n                  <button",
      'portal: mostrar botão CTA LP interna'
    )
  }

  write(file, content)
}

try {
  patchAdminAnunciosRoute()
  patchDashboardAnunciosPage()
  patchPortalPage()
  console.log('Patch LP interna aplicado com sucesso.')
} catch (error) {
  console.error(error)
  process.exit(1)
}
