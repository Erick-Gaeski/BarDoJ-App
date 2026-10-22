"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { vendaRapida } from "@/lib/contabar/acoes";
import {
  centavosParaTexto,
  formatarBRL,
  formatarHora,
  paraCentavos,
} from "@/lib/contabar/dinheiro";
import { useLoja } from "@/lib/contabar/loja";
import {
  rotuloComanda,
  totalAvista,
  turnoAberto,
} from "@/lib/contabar/regras";
import type { FormaPagamento } from "@/lib/contabar/tipos";
import { FORMAS, ROTULO_FORMA } from "@/lib/contabar/tipos";
import { Campo, Mensagem, Pagina, Selecao, Vazio } from "./ui";

interface LinhaPagamento {
  chave: number;
  forma: FormaPagamento;
  /** Vazio significa "o restante". */
  valor: string;
}

/** Venda rápida: produtos pagos na hora, sem fiado. */
export function TelaVendas() {
  const { estado, executar } = useLoja();
  const turno = turnoAberto(estado);
  const [busca, setBusca] = useState("");
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [pagamentos, setPagamentos] = useState<LinhaPagamento[]>([
    { chave: 1, forma: "dinheiro", valor: "" },
  ]);
  const [proximaChave, setProximaChave] = useState(2);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const produtos = useMemo(
    () =>
      estado.produtos
        .filter((p) => p.ativo)
        .filter((p) => p.nome.toLowerCase().includes(busca.trim().toLowerCase())),
    [estado.produtos, busca],
  );

  const linhasCarrinho = Object.entries(carrinho)
    .filter(([, q]) => q > 0)
    .map(([id, quantidade]) => {
      const produto = estado.produtos.find((p) => p.id === id);
      return { id, quantidade, produto };
    })
    .filter((l) => l.produto);
  const total = linhasCarrinho.reduce(
    (s, l) => s + l.quantidade * (l.produto?.precoCentavos ?? 0),
    0,
  );

  function alterar(id: string, delta: number) {
    setSucesso(null);
    setCarrinho((c) => ({ ...c, [id]: Math.max((c[id] ?? 0) + delta, 0) }));
  }

  function valoresDosPagamentos(): Array<{ forma: FormaPagamento; valorCentavos: number }> | string {
    const vazias = pagamentos.filter((p) => p.valor.trim() === "");
    if (vazias.length > 1) return "Só uma forma de pagamento pode ficar em branco (o restante)";
    let somaInformada = 0;
    const resultado: Array<{ forma: FormaPagamento; valorCentavos: number | null }> = [];
    for (const p of pagamentos) {
      if (p.valor.trim() === "") {
        resultado.push({ forma: p.forma, valorCentavos: null });
        continue;
      }
      const v = paraCentavos(p.valor);
      if (v === null || v <= 0) return "Informe valores de pagamento válidos";
      somaInformada += v;
      resultado.push({ forma: p.forma, valorCentavos: v });
    }
    const restante = total - somaInformada;
    if (restante < 0) return "Os pagamentos passam do total da venda";
    return resultado
      .map((r) => ({ forma: r.forma, valorCentavos: r.valorCentavos ?? restante }))
      .filter((r) => r.valorCentavos > 0);
  }

  function registrar() {
    setErro(null);
    setSucesso(null);
    const pags = valoresDosPagamentos();
    if (typeof pags === "string") {
      setErro(pags);
      return;
    }
    const r = executar((e) =>
      vendaRapida(e, {
        itens: linhasCarrinho.map((l) => ({
          produtoId: l.id,
          quantidade: l.quantidade,
        })),
        pagamentos: pags,
      }),
    );
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setCarrinho({});
    setPagamentos([{ chave: proximaChave, forma: "dinheiro", valor: "" }]);
    setProximaChave((n) => n + 1);
    setSucesso(`Venda registrada: ${formatarBRL(total)}.`);
  }

  const recentes = estado.comandas
    .filter((c) => c.encerradaEm && totalAvista(estado, c.id) > 0)
    .sort((a, b) => (b.encerradaEm ?? "").localeCompare(a.encerradaEm ?? ""))
    .slice(0, 6);

  return (
    <Pagina
      titulo="Vendas"
      descricao="Venda rápida, paga na hora. Para comandas e fiado, use as outras telas."
    >
      {!turno && (
        <Mensagem tipo="aviso">
          Não há turno de caixa aberto, então não dá para registrar recebimentos.{" "}
          <Link href="/painel/caixa" className="font-semibold underline underline-offset-4">
            Abrir o caixa
          </Link>
        </Mensagem>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="space-y-3">
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto"
            aria-label="Buscar produto"
          />
          {produtos.length === 0 ? (
            <Vazio>Nenhum produto encontrado.</Vazio>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {produtos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => alterar(p.id, 1)}
                  className="rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent"
                >
                  <span className="block text-sm font-medium">{p.nome}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {formatarBRL(p.precoCentavos)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <Card className="h-fit space-y-4 p-4">
          <h2 className="font-semibold">Venda atual</h2>
          {linhasCarrinho.length === 0 ? (
            <p className="text-sm text-muted-foreground">Toque num produto para adicionar.</p>
          ) : (
            <ul className="divide-y">
              {linhasCarrinho.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{l.produto?.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatarBRL((l.produto?.precoCentavos ?? 0) * l.quantidade)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => alterar(l.id, -1)} aria-label="Diminuir">
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-6 text-center text-sm">{l.quantidade}</span>
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => alterar(l.id, 1)} aria-label="Aumentar">
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => alterar(l.id, -l.quantidade)} aria-label="Remover">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-xl font-bold">{formatarBRL(total)}</span>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Pagamento</p>
            {pagamentos.map((p, i) => (
              <div key={p.chave} className="flex gap-2">
                <Selecao
                  value={p.forma}
                  aria-label="Forma de pagamento"
                  onChange={(e) =>
                    setPagamentos((lista) =>
                      lista.map((x) =>
                        x.chave === p.chave ? { ...x, forma: e.target.value as FormaPagamento } : x,
                      ),
                    )
                  }
                  className="w-32 shrink-0"
                >
                  {FORMAS.map((f) => (
                    <option key={f} value={f}>
                      {ROTULO_FORMA[f]}
                    </option>
                  ))}
                </Selecao>
                <Input
                  inputMode="decimal"
                  value={p.valor}
                  placeholder={i === pagamentos.length - 1 ? "Restante" : "Valor"}
                  aria-label="Valor pago nesta forma"
                  onChange={(e) =>
                    setPagamentos((lista) =>
                      lista.map((x) => (x.chave === p.chave ? { ...x, valor: e.target.value } : x)),
                    )
                  }
                />
                {pagamentos.length > 1 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setPagamentos((lista) => lista.filter((x) => x.chave !== p.chave))}
                    aria-label="Remover forma"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                setPagamentos((l) => [...l, { chave: proximaChave, forma: "pix", valor: "" }]);
                setProximaChave((n) => n + 1);
              }}
              className="text-xs underline underline-offset-4"
            >
              Dividir em mais de uma forma
            </button>
            {pagamentos.length === 1 && total > 0 && (
              <button
                type="button"
                onClick={() =>
                  setPagamentos((l) => l.map((x) => ({ ...x, valor: centavosParaTexto(total) })))
                }
                className="ml-3 text-xs underline underline-offset-4"
              >
                Preencher com o total
              </button>
            )}
          </div>

          {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
          {sucesso && <Mensagem tipo="ok">{sucesso}</Mensagem>}

          <Button
            className="w-full"
            disabled={linhasCarrinho.length === 0 || !turno}
            onClick={registrar}
          >
            Registrar venda paga
          </Button>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-2 font-semibold">Últimas vendas encerradas</h2>
        {recentes.length === 0 ? (
          <Vazio>Nenhuma venda encerrada ainda.</Vazio>
        ) : (
          <ul className="divide-y">
            {recentes.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/painel/comandas/${c.id}`}
                  className="flex items-center justify-between py-2 text-sm hover:bg-accent/50"
                >
                  <span>
                    {rotuloComanda(estado, c)}{" "}
                    <span className="text-muted-foreground">
                      · {c.encerradaEm ? formatarHora(c.encerradaEm) : ""}
                    </span>
                  </span>
                  <span className="font-semibold">{formatarBRL(totalAvista(estado, c.id))}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Campo rotulo="">
        <span className="sr-only">Fim da tela de vendas</span>
      </Campo>
    </Pagina>
  );
}
