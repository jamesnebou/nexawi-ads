// ... (imports and supabase client) ...

export default function Anuncios() {
  // ... (all state variables) ...

  // ... (useEffect and buscarDados) ...

  // ... (abrirModal, fecharModal, allActiveHotspotsForModal, salvar, toggleAtivo, excluir) ...

  return (
    <>
      {/* NOVO: Wrapper para alinhar todo o conteúdo principal */}
      <div className="px-4 sm:px-6 md:px-8">
        {/* Header da página - Ajustado para alinhar o botão */}
        <div className="flex items-center justify-between mb-6">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl font-bold text-white">Anúncios</h1>
            <p className="text-gray-400 text-sm mt-1">Gerencie os anúncios exibidos no portal de captação</p>
          </div>
          <button
            onClick={() => abrirModal()}
            className="bg-green-500 hover:bg-green-400 text-black font-semibold px-4 py-2 rounded-xl text-sm transition-colors flex-shrink-0"
          >
            + Novo Anúncio
          </button>
        </div>

        {/* Seção de Busca e Filtros - Removido mx- para que o wrapper cuide do espaçamento */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Input de Busca */}
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por título ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
              />
            </div>

            {/* Filtro por Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500"
            >
              <option value="todos">Status: Todos</option>
              <option value="ativo">Status: Ativos</option>
              <option value="inativo">Status: Inativos</option>
            </select>

            {/* Filtro por Hotspot */}
            <select
              value={filterHotspotId}
              onChange={(e) => setFilterHotspotId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500"
            >
              <option value="">Hotspot: Todos</option>
              {hotspots.map((h) => (
                <option key={h.id} value={h.id}>{h.nome}</option>
              ))}
            </select>

            {/* Filtro por Cliente */}
            <select
              value={filterClientId}
              onChange={(e) => {
                console.log('Cliente selecionado no dropdown (onChange):', e.target.value);
                setFilterClientId(e.target.value);
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500"
            >
              <option value="">Cliente: Todos</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>

            {/* Filtro por Tipo de Mídia */}
            <select
              value={filterMediaType}
              onChange={(e) => setFilterMediaType(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500"
            >
              <option value="todos">Mídia: Todas</option>
              <option value="imagem">Mídia: Imagem</option>
              <option value="video">Mídia: Vídeo</option>
            </select>
          </div>
        </div>

        {carregando ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : anuncios.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center"> {/* Removido mx- */}
            <div className="text-4xl mb-3">📢</div>
            <h3 className="text-white font-semibold mb-1">Nenhum anúncio encontrado</h3>
            <p className="text-gray-500 text-sm mb-4">Ajuste seus filtros ou crie um novo anúncio.</p>
            <button
              onClick={() => abrirModal()}
              className="bg-green-500 hover:bg-green-400 text-black font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              Criar primeiro anúncio
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"> {/* Removido mx- */}
            {anuncios.map((anuncio) => (
              <div key={anuncio.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-row items-center gap-4 w-full">
               <div className="flex-shrink-0 flex items-center justify-center relative">
                  {anuncio.media_url ? (
                      anuncio.tipo_media === 'video' ? (
                      <video
                          src={anuncio.media_url}
                          className="w-[108px] h-48 object-cover rounded-xl"
                          controls={false}
                          muted
                          loop
                          playsInline
                          autoplay
                          type="video/mp4"
                          onError={(e) => {
                              e.target.classList.add('hidden');
                              e.target.nextSibling.classList.remove('hidden');
                          }}
                      />
                      ) : (
                      <img
                          src={anuncio.media_url}
                          alt={anuncio.titulo}
                          className="w-[108px] h-48 object-cover rounded-xl"
                          onError={(e) => {
                              e.target.classList.add('hidden');
                              e.target.nextSibling.classList.remove('hidden');
                          }}
                      />
                      )
                  ) : null}
                  <div
                      className={`w-[108px] h-48 bg-gray-800 rounded-xl flex items-center justify-center text-4xl ${anuncio.media_url ? 'hidden' : ''}`}
                  >
                      {anuncio.tipo_media === 'video' ? <VideoIcon size={40} className="text-gray-400" /> : <ImageIcon size={40} className="text-gray-400" />}
                  </div>
               </div>

                {/* CONTEÚDO DO CARD - CENTRALIZADO */}
                <div className="flex-1 min-w-0 flex flex-col gap-1 items-center w-full text-center"> {/* items-center e text-center */}
                  <div className="flex flex-wrap items-center gap-2 justify-center"> {/* justify-center para o título/status */}
                    <h3 className="text-white font-semibold text-sm">{anuncio.titulo}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${anuncio.ativo ? 'bg-green-400/10 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                      {anuncio.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  {anuncio.descricao && (
                    <p className="text-gray-500 text-xs mb-1">{anuncio.descricao}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 justify-center"> {/* justify-center para info */}
                    <span className="flex items-center gap-1.5 flex-shrink-0">
                      <MapPin size={11} className="flex-shrink-0" />
                      <span>{anuncio.hotspots?.nome || '—'}</span>
                    </span>
                    <span className="flex items-center gap-1.5 flex-shrink-0">
                      <Clock size={11} className="flex-shrink-0" />
                      <span>{anuncio.duracao_segundos}s</span>
                    </span>
                    {anuncio.url_destino && (
                      <a
                        href={(() => {
                          let rawUrl = anuncio.url_destino;
                          let formattedUrl = rawUrl;

                          if (rawUrl.startsWith('wa.me/')) {
                              formattedUrl = 'https://' + rawUrl.replace('wa.me//', 'wa.me/');
                          } else if (!(rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))) {
                              formattedUrl = `https://${rawUrl}`;
                          }
                          return formattedUrl;
                        })()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-blue-400 hover:underline flex-shrink-0"
                      >
                        <ExternalLink size={11} className="flex-shrink-0" />
                        <span>CTA</span>
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-2 justify-center"> {/* justify-center para métricas */}
                    <span className="flex items-center gap-1.5 flex-shrink-0">
                      <User size={11} className="flex-shrink-0" />
                      <span>Cliente: {anuncio.hotspots?.clientes?.nome || 'N/A'}</span>
                    </span>
                    <span className="flex items-center gap-1.5 flex-shrink-0">
                      <Eye size={11} className="flex-shrink-0" />
                      <span>Visualizações: {anuncio.views}</span>
                    </span>
                    <span className="flex items-center gap-1.5 flex-shrink-0">
                      <MousePointerClick size={11} className="flex-shrink-0" />
                      <span>Cliques: {anuncio.clicks}</span>
                    </span>
                  </div>

                  {/* BOTÕES DO CARD - LADO A LADO E CENTRALIZADOS */}
                  <div className="flex flex-row gap-2 mt-3 flex-shrink-0 justify-center"> {/* Removido flex-wrap, adicionado justify-center */}
                    <button
                      onClick={() => toggleAtivo(anuncio)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex-shrink-0 ${anuncio.ativo ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-green-500/10 hover:bg-green-500/20 text-green-400'}`}
                    >
                      {anuncio.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => abrirModal(anuncio)}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors flex-shrink-0"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => excluir(anuncio.id)}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-400/10 hover:bg-red-400/20 text-red-400 transition-colors flex-shrink-0"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div> {/* Fim do NOVO Wrapper */}

      {modalAberto && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-800 flex-shrink-0">
              <h2 className="text-white font-bold text-lg">
                {anuncioEditando ? 'Editar Anúncio' : 'Novo Anúncio'}
              </h2>
              <button onClick={fecharModal} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">×</button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              {/* Campo de seleção de Cliente */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Cliente</label>
                <select
                  value={selectedClientInModal}
                  onChange={(e) => {
                    console.log('Cliente selecionado no dropdown (onChange):', e.target.value);
                    setSelectedClientInModal(e.target.value);
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500"
                >
                  <option value="">Selecione um cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              {/* Campo de seleção de Hotspot - AGORA MOSTRA TODOS OS HOTSPOTS ATIVOS */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Hotspot</label>
                <select
                  value={form.hotspot_id}
                  onChange={(e) => setForm({ ...form, hotspot_id: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500"
                >
                  <option value="">Selecione um hotspot</option>
                  {allActiveHotspotsForModal.map((h) => ( // Usa a lista de TODOS os hotspots ativos
                    <option key={h.id} value={h.id}>{h.nome}</option>
                  ))}
                </select>
              </div>

              {/* Campo de Título do anúncio */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Título do anúncio</label>
                <input
                  type="text"
                  placeholder="Ex: 20% de desconto na sua próxima compra"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
              </div>

              {/* Campo de Descrição */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Descrição</label>
                <textarea
                  placeholder="Detalhes da oferta ou mensagem..."
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 resize-none"
                />
              </div>

              {/* Campo de Mídia do anúncio */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Mídia do anúncio (Imagem ou Vídeo)</label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-500 file:text-black hover:file:bg-green-400"
                />
                {(selectedFile || form.media_url) && (
                  <div className="mt-3 flex items-center gap-3">
                    <p className="text-xs text-gray-400">Pré-visualização:</p>
                    {selectedFile && selectedFile.type.startsWith('video/') ? (
                      <video
                        src={URL.createObjectURL(selectedFile)}
                        className="w-32 h-[228px] object-cover rounded-lg border border-gray-700"
                        controls={false}
                        muted
                        loop
                        playsInline
                        autoplay
                        type={selectedFile.type}
                      />
                    ) : selectedFile && selectedFile.type.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(selectedFile)}
                        alt="Pré-visualização"
                        className="w-32 h-[228px] object-cover rounded-lg border border-gray-700"
                      />
                    ) : form.media_url && form.tipo_media === 'video' ? (
                      <video
                        src={form.media_url}
                        className="w-32 h-[228px] object-cover rounded-lg border border-gray-700"
                        controls={false}
                        muted
                        loop
                        playsInline
                        autoplay
                        type="video/mp4"
                      />
                    ) : form.media_url && form.tipo_media === 'imagem' ? (
                      <img
                        src={form.media_url}
                        alt="Pré-visualização"
                        className="w-32 h-[228px] object-cover rounded-lg border border-gray-700"
                      />
                    ) : null}
                    {selectedFile && (
                      <p className="text-xs text-gray-500 truncate flex-1">{selectedFile.name}</p>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-600 mt-1">Selecione uma imagem ou vídeo para o anúncio. Imagem: 1080x1920px. Vídeo: MP4, WebM.</p>
              </div>

              {/* Campo de URL de destino (CTA) */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">URL de destino (CTA)</label>
                <input
                  type="url"
                  placeholder="https://seusite.com.br"
                  value={form.url_destino}
                  onChange={(e) => setForm({ ...form, url_destino: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
              </div>

              {/* Campo de Duração obrigatória */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Duração obrigatória (segundos)</label>
                <select
                  value={form.duracao_segundos}
                  onChange={(e) => setForm({ ...form, duracao_segundos: parseInt(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500"
                >
                  <option value={10}>10 segundos</option>
                  <option value={15}>15 segundos</option>
                  <option value={20}>20 segundos</option>
                  <option value={30}>30 segundos</option>
                  <option value={40}>40 segundos</option>
                </select>
                <p className="text-xs text-gray-600 mt-1">O usuário precisa aguardar esse tempo antes de continuar</p>
              </div>

              {/* Checkbox Anúncio ativo */}
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-800 rounded-xl border border-gray-700">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                  className="accent-green-500"
                />
                <span className="text-sm text-gray-300">Anúncio ativo</span>
              </label>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-800 flex-shrink-0">
              <button
                onClick={fecharModal}
                className="flex-1 py-3 rounded-xl font-medium text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando || uploading || !form.titulo.trim() || !form.hotspot_id}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-black bg-green-500 hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {(salvando || uploading) ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  anuncioEditando ? 'Salvar alterações' : 'Criar anúncio'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}