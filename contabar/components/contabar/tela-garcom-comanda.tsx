"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { lancarItem, nomeUsuario } from "@/lib/contabar/acoes";
import { formatarBRL } from "@/lib/contabar/dinheiro";
import { useLoja } from "@/lib/contabar/loja";
import {
  comandaVisivelParaGarcom,
  itensComStatus,
  nomeProduto,
  rotuloComanda,
  totalGeral,
} from "@/lib/contabar/regras";
import type { Destino } from "@/lib/contabar/tipos";
import { Etiqueta, Mensagem, Pagina, Vazio } from "./ui";

/**
 * Lançar itens numa comanda (celular). O garçom vê o total da comanda, mas
 * nunca o saldo da conta do cliente nem nada do caixa.
 */
export function TelaGarcomComanda() {
  const { id } = useParams<{ id: string }>();
  const { estado, executar } = useLoja();
  const [busca, setBusca] = useState("");
  const [destino, setDestino] = useState<Destino>("avista");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const comanda = estado.comandas.find((c) => c.id === id);
  const visivel =
    !!comanda && comandaVisivelParaGarcom(estado, comanda, nomeUsuario(estado));

  if (!comanda || !visivel) {
    return (
      <Pagina titulo="Comanda indisponível">
        <Vazio>
          Esta comanda não existe, já foi encerrada ou foi aberta por outro garçom.
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href="/garcom">Voltar às comandas</Link>
            </Button>
          </div>
        </Vazio>
      </Pagina>
    );
  }

  const contaPossivel = estado.configuracoes.fiadoAtivo && !!comanda.clienteId;
  const destinoEfetivo: Destino = contaPossivel ? destino : "avista";
  const itens = itensComStatus(estado, comanda.id);
  const produtos = estado.produtos
    .filter((p) => p.ativo)
    .filter((p) => p.nome.toLowerCase().includes(busca.trim().toLowerCase()));

  function adicionar(produtoId: string) {
    setErro(null);
    setAviso(null);
    const r = executar((e) =>
      lancarItem(e, {
        comandaId: comanda!.id,
        produtoId,
        quantidade: 1,
        destino: destinoEfetivo,
      }),
    );
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setAviso(`${nomeProduto(estado, produtoId)} adicionado.`);
  }

  return (
    <Pagina
      titulo={rotuloComanda(estado, comanda)}
      acoes={
        <Button asChild variant="outline">
          <Link href="/garcom">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Comandas
          </Link>
        </Button>
      }
    >
      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <span className="text-sm text-muted-foreground">Total da comanda</span>
        <span className="text-2xl font-bold">{formatarBRL(totalGeral(estado, comanda.id))}</span>
      </div>

      {estado.configuracoes.fiadoAtivo && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Lançar como</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="h-12 text-base"
              variant={destinoEfetivo === "avista" ? "default" : "outline"}
              onClick={() => setDestino("avista")}
            >
              À vista
            </Button>
            <Button
              className="h-12 text-base"
              variant={destinoEfetivo === "conta" ? "default" : "outline"}
              disabled={!contaPossivel}
              onClick={() => setDestino("conta")}
            >
              Na conta (fiado)
            </Button>
          </div>
          {!comanda.clienteId && (
            <p className="text-xs text-muted-foreground">
              Para lançar na conta, a comanda precisa ter um cliente.
            </p>
          )}
        </div>
      )}

      {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
      {aviso && <Mensagem tipo="ok">{aviso}</Mensagem>}

      <Input
        className="h-12 text-base"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar produto"
        aria-label="Buscar produto"
      />

      {produtos.length === 0 ? (
        <Vazio>Nenhum produto encontrado.</Vazio>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {produtos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => adicionar(p.id)}
              className="min-h-20 rounded-lg border bg-card p-3 text-left transition-colors active:bg-accent"
            >
              <span className="block text-base font-medium leading-tight">{p.nome}</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {formatarBRL(p.precoCentavos)}
              </span>
            </button>
          ))}
        </div>
      )}

      <Card className="space-y-2 p-4">
        <h2 className="font-semibold">Itens lançados</h2>
        {itens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum item ainda.</p>
        ) : (
          <ul className="divide-y">
            {itens.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                <div className={i.cancelado ? "text-muted-foreground line-through" : ""}>
                  <p className="text-sm font-medium">
                    {nomeProduto(estado, i.produtoId)} × {i.quantidade}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {i.destino === "conta" ? "Na conta (fiado)" : "À vista"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {i.cancelado && <Etiqueta tom="perigo">Cancelado</Etiqueta>}
                  <span className="text-sm font-semibold">{formatarBRL(i.valorCentavos)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="pt-2 text-xs text-muted-foreground">
          Lançou algo errado? Chame o administrador para cancelar o item.
        </p>
      </Card>
    </Pagina>
  );
}
