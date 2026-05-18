"use client";

import { useState, useEffect } from "react";

export default function LocationSelector() {
  const [estados, setEstados] = useState([]);
  const [cidades, setCidades] = useState([]);
  const [estadoSelecionado, setEstadoSelecionado] = useState("");
  const [cidadeSelecionada, setCidadeSelecionada] = useState("");

  // 1. Busca os Estados (UF) assim que a tela carrega
  useEffect(() => {
    fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome")
      .then((resposta) => resposta.json())
      .then((dados) => setEstados(dados));
  }, []);

  // 2. Busca as Cidades sempre que o usuário escolhe um Estado
  useEffect(() => {
    if (!estadoSelecionado) {
      return;
    }

    let ativo = true;

    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estadoSelecionado}/municipios`)
      .then((resposta) => resposta.json())
      .then((dados) => {
        if (ativo) setCidades(dados);
      });

    return () => {
      ativo = false;
    };
  }, [estadoSelecionado]);

  const cidadesDisponiveis = estadoSelecionado ? cidades : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "15px", maxWidth: "300px" }}>

      {/* Campo 1: Seleção de Estado */}
      <div>
        <label htmlFor="estado">Estado (UF)</label>
        <select
          id="estado"
          value={estadoSelecionado}
          onChange={(e) => {
            setEstadoSelecionado(e.target.value);
            setCidadeSelecionada(""); // Reseta a cidade ao trocar de estado
          }}
          style={{ width: "100%", padding: "8px", marginTop: "5px" }}
        >
          <option value="">Selecione um estado...</option>
          {estados.map((uf) => (
            <option key={uf.id} value={uf.sigla}>
              {uf.nome} ({uf.sigla})
            </option>
          ))}
        </select>
      </div>

      {/* Campo 2: Seleção de Cidade com Digitação (Datalist) */}
      <div>
        <label htmlFor="cidade">Cidade</label>
        <input
          list="lista-cidades"
          id="cidade"
          placeholder={estadoSelecionado ? "Digite para buscar..." : "Escolha o estado primeiro"}
          value={cidadeSelecionada}
          onChange={(e) => setCidadeSelecionada(e.target.value)}
          disabled={!estadoSelecionado} // Fica bloqueado até escolher o estado
          style={{ width: "100%", padding: "8px", marginTop: "5px" }}
        />

        {/* A mágica do filtro por digitação acontece aqui */}
        <datalist id="lista-cidades">
          {cidadesDisponiveis.map((cidade) => (
            <option key={cidade.id} value={cidade.nome} />
          ))}
        </datalist>
      </div>

    </div>
  );
}
