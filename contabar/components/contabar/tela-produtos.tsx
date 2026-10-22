"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { alternarProduto, salvarProduto } from "@/lib/contabar/acoes";
import { centavosParaTexto, formatarBRL, paraCentavos } from "@/lib/contabar/dinheiro";
import { useLoja } from "@/lib/contabar/loja";
import { Campo, Etiqueta, Mensagem, Modal, Pagina, Vazio } from "./ui";

export function TelaProdutos() {
  const { estado, executar } = useLoja();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | undefined>();
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const produtos = estado.produtos
    .filter((p) => p.nome.toLowerCase().includes(busca.trim().toLowerCase()))
    .sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome));

  function abrirNovo() {
    setEditandoId(undefined);
    setNome("");
    setPreco("");
    setErro(null);
    setAberto(true);
  }

  function abrirEdicao(id: string) {
    const p = estado.produtos.find((x) => x.id === id);
    if (!p) return;
    setEditandoId(p.id);
    setNome(p.nome);
    setPreco(centavosParaTexto(p.precoCentavos));
    setErro(null);
    setAberto(true);
  }

  function salvar() {
    setErro(null);
    const centavos = paraCentavos(preco);
    if (centavos === null) {
      setErro("Informe um preço válido");
      return;
    }
    const r = executar((e) =>
      salvarProduto(e, { id: editandoId, nome, precoCentavos: centavos }),
    );
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setAberto(false);
  }

  return (
    <Pagina
      titulo="Produtos"
      descricao="Cardápio do bar. Produtos desativados não aparecem para lançar, mas ficam no histórico."
      acoes={
        <Button onClick={abrirNovo}>
          <Plus className="mr-1 h-4 w-4" />
          Novo produto
        </Button>
      }
    >
      <Input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar produto"
        aria-label="Buscar produto"
        className="max-w-sm"
      />
      {produtos.length === 0 ? (
        <Vazio>Nenhum produto encontrado.</Vazio>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {produtos.map((p) => (
            <Card key={p.id} className="flex items-center justify-between gap-3 p-4">
              <div className={p.ativo ? "" : "text-muted-foreground"}>
                <p className="font-medium">{p.nome}</p>
                <p className="text-sm">{formatarBRL(p.precoCentavos)}</p>
              </div>
              <div className="flex items-center gap-2">
                {!p.ativo && <Etiqueta>Inativo</Etiqueta>}
                <Button size="sm" variant="outline" onClick={() => abrirEdicao(p.id)}>
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => executar((e) => alternarProduto(e, p.id))}
                >
                  {p.ativo ? "Desativar" : "Ativar"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo={editandoId ? "Editar produto" : "Novo produto"}
      >
        <div className="space-y-4">
          <Campo rotulo="Nome">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>
          <Campo rotulo="Preço" dica="Mudar o preço não altera vendas já lançadas.">
            <Input inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="0,00" />
          </Campo>
          {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </Pagina>
  );
}
