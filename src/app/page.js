// 1. Importe o componente no topo do arquivo
import LocationSelector from "@/components/LocationSelector";

export default function MinhaTelaDeCadastro() {
  return (
    <form>
      <h2>Cadastro de Cliente</h2>

      {/* Outros campos do seu formulário (Nome, Email, etc) */}

      {/* 2. Aqui você "chama" o componente de cidades para aparecer na tela */}
      <LocationSelector />

      <button type="submit">Salvar</button>
    </form>
  );
}