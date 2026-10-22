"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  cancelarItem,
  encerrarComanda,
  estornarRecebimento,
  lancarItem,
  receberComanda,
} from "@/lib/contabar/acoes";
import {
  centavosParaTexto,
  formatarBRL,
  formatarDataHora,
  paraCentavos,
} from "@/lib/contabar/dinheiro";
import { useLoja } from "@/lib/contabar/loja";
import {
  aReceberComanda,
  itensComStatus,
  nomeProduto,
  recebidoComanda,
  recebimentoEstornado,
  recebimentosDaComanda,
  rotuloComanda,
  totalAvista,
  totalConta,
  turnoAberto,
} from "@/lib/contabar/regras";
import type { Destino, FormaPagamento } from "@/lib/contabar/tipos";
import { FORMAS, ROTULO_FORMA } from "@/lib/contabar/tipos";
import { Campo, Estatistica, Etiqueta, Linha, Mensagem, Modal, Pagina, Selecao, Vazio } from "./ui";

export function TelaComandaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { estado, executar } = useLoja();

  const [produtoId, setProdutoId] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [destino, setDestino] = useState<Destino>("avista");
  const [erro, setErro] = useState<string | null>(null);

  const [cancelando, setCancelando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [erroModal, setErroModal] = useState<string | null>(null);

  const [recebendo, setRecebendo] = useState(false);
  const [forma, setForma] = useState<FormaPagamento>("dinheiro");
  const [valor, setValor] = useState("");

  const [estornando, setEstornando] = useState<string | null>(null);

  const comanda = estado.comandas.find((c) => c.id === id);
  if (!comanda) {
    return (
      <Pagina titulo="Comanda não encontrada">
        <Vazio>
          Esta comanda não existe nos dados de exemplo.{" "}
          <Link href="/painel/comandas" className="underline underline-offset-4">
            Voltar para as comandas
          </Link>
        </Vazio>
      </Pagina>
    );
  }

  const aberta = !comanda.encerradaEm;
  const turno = turnoAberto(estado);
  const itens = itensComStatus(estado, comanda.id);
  const recebimentos = recebimentosDaComanda(estado, comanda.id).sort((a, b) =>
    a.registradoEm.localeCompare(b.registradoEm),
  );
  const aReceber = aReceberComanda(estado, comanda.id);
  const produtosAtivos = estado.produtos.filter((p) => p.ativo);
  const produtoAtual = produtoId || produtosAtivos[0]?.id || "";
  const cliente = comanda.clienteId
    ? estado.clientes.find((c) => c.id === comanda.clienteId)
    : undefined;

  const contaPossivel = estado.configuracoes.fiadoAtivo && !!comanda.clienteId;
  const motivoContaIndisponivel = !estado.configuracoes.fiadoAtivo
    ? "Este bar não trabalha com fiado."
    : !comanda.clienteId
      ? "Escolha um cliente na comanda para lançar na conta."
      : null;

  function adicionar() {
    setErro(null);
    const r = executar((e) =>
      lancarItem(e, {
        comandaId: comanda!.id,
        produtoId: produtoAtual,
        quantidade: Number(quantidade),
        destino: contaPossivel ? destino : "avista",
      }),
    );
    if (!r.ok) setErro(r.erro);
    else setQuantidade("1");
  }

  function confirmarCancelamento() {
    if (!cancelando) return;
    setErroModal(null);
    const r = executar((e) => cancelarItem(e, { itemId: cancelando, motivo }));
    if (!r.ok) {
      setErroModal(r.erro);
      return;
    }
    setCancelando(null);
    setMotivo("");
  }

  function abrirRecebimento() {
    setErroModal(null);
    setForma("dinheiro");
    setValor(aReceber > 0 ? centavosParaTexto(aReceber) : "");
    setRecebendo(true);
  }

  function confirmarRecebimento() {
    setErroModal(null);
    const centavos = paraCentavos(valor);
    if (centavos === null || centavos <= 0) {
      setErroModal("Informe um valor válido");
      return;
    }
    const r = executar((e) =>
      receberComanda(e, { comandaId: comanda!.id, forma, valorCentavos: centavos }),
    );
    if (!r.ok) {
      setErroModal(r.erro);
      return;
    }
    setRecebendo(false);
  }

  function confirmarEstorno() {
    if (!estornando) return;
    setErroModal(null);
    const r = executar((e) => estornarRecebimento(e, { recebimentoId: estornando, motivo }));
    if (!r.ok) {
      setErroModal(r.erro);
      return;
    }
    setEstornando(null);
    setMotivo("");
  }

  function encerrar() {
    setErro(null);
    const r = executar((e) => encerrarComanda(e, comanda!.id));
    if (!r.ok) setErro(r.erro);
  }

  return (
    <Pagina
      titulo={rotuloComanda(estado, comanda)}
      descricao={`Aberta por ${comanda.abertaPor} em ${formatarDataHora(comanda.abertaEm)}`}
      acoes={
        <>
          <Button asChild variant="outline">
            <Link href="/painel/comandas">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Comandas
            </Link>
          </Button>
          {aberta && (
            <Button onClick={encerrar} disabled={aReceber !== 0}>
              Encerrar comanda
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        {aberta ? <Etiqueta tom="info">Aberta</Etiqueta> : <Etiqueta>Encerrada</Etiqueta>}
        {cliente && <Etiqueta tom="neutro">Cliente: {cliente.nome}</Etiqueta>}
        {!aberta && aReceber !== 0 && <Etiqueta tom="perigo">Divergência: {formatarBRL(aReceber)}</Etiqueta>}
      </div>

      {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
      {aberta && aReceber !== 0 && (
        <Mensagem tipo="info">
          {aReceber > 0
            ? "Para encerrar, receba o valor que falta da parte à vista."
            : "Foi recebido a mais do que o total à vista. Estorne o excesso para poder encerrar."}
        </Mensagem>
      )}
      {!aberta && aReceber !== 0 && (
        <Mensagem tipo="erro">
          Esta comanda foi encerrada e hoje tem diferença entre o total à vista e o
          recebido (por cancelamento ou estorno depois do encerramento). Acerte com um
          recebimento ou estorno.
        </Mensagem>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Estatistica titulo="Total à vista" valor={formatarBRL(totalAvista(estado, comanda.id))} />
        <Estatistica titulo="Total na conta (fiado)" valor={formatarBRL(totalConta(estado, comanda.id))} detalhe="Não passa pelo caixa" />
        <Estatistica titulo="Recebido" valor={formatarBRL(recebidoComanda(estado, comanda.id))} />
        <Estatistica
          titulo="A receber"
          valor={formatarBRL(aReceber)}
          tom={aReceber === 0 ? "ok" : "alerta"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-3 p-4">
          <h2 className="font-semibold">Itens</h2>
          {itens.length === 0 ? (
            <Vazio>Nenhum item lançado.</Vazio>
          ) : (
            <ul className="divide-y">
              {itens.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                  <div className={i.cancelado ? "text-muted-foreground line-through" : ""}>
                    <p className="text-sm font-medium">
                      {nomeProduto(estado, i.produtoId)} × {i.quantidade}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {i.registradoPor} ·{" "}
                      {i.destino === "conta" ? "na conta (fiado)" : "à vista"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{formatarBRL(i.valorCentavos)}</span>
                    {i.cancelado ? (
                      <Etiqueta tom="perigo">Cancelado</Etiqueta>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setErroModal(null);
                          setMotivo("");
                          setCancelando(i.id);
                        }}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {aberta && (
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold">Adicionar item</h3>
              <div className="grid gap-3 sm:grid-cols-[1fr_6rem]">
                <Campo rotulo="Produto">
                  <Selecao value={produtoAtual} onChange={(e) => setProdutoId(e.target.value)}>
                    {produtosAtivos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} — {formatarBRL(p.precoCentavos)}
                      </option>
                    ))}
                  </Selecao>
                </Campo>
                <Campo rotulo="Qtd.">
                  <Input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                  />
                </Campo>
              </div>
              <fieldset className="space-y-1">
                <legend className="text-sm font-medium">Destino</legend>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="destino"
                      checked={destino === "avista" || !contaPossivel}
                      onChange={() => setDestino("avista")}
                    />
                    À vista (pago no caixa)
                  </label>
                  <label className={`flex items-center gap-2 ${contaPossivel ? "" : "opacity-50"}`}>
                    <input
                      type="radio"
                      name="destino"
                      disabled={!contaPossivel}
                      checked={destino === "conta" && contaPossivel}
                      onChange={() => setDestino("conta")}
                    />
                    Na conta (fiado)
                  </label>
                </div>
                {motivoContaIndisponivel && (
                  <p className="text-xs text-muted-foreground">{motivoContaIndisponivel}</p>
                )}
              </fieldset>
              <Button onClick={adicionar} disabled={!produtoAtual}>
                Adicionar
              </Button>
            </div>
          )}
        </Card>

        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recebimentos desta comanda</h2>
            <Button size="sm" onClick={abrirRecebimento} disabled={!turno}>
              Receber
            </Button>
          </div>
          {!turno && (
            <Mensagem tipo="aviso">
              Sem turno de caixa aberto.{" "}
              <Link href="/painel/caixa" className="font-semibold underline underline-offset-4">
                Abrir o caixa
              </Link>
            </Mensagem>
          )}
          {recebimentos.length === 0 ? (
            <Vazio>Nenhum recebimento ainda.</Vazio>
          ) : (
            <ul className="divide-y">
              {recebimentos.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">
                      {r.tipo === "estorno" ? "Estorno · " : ""}
                      {ROTULO_FORMA[r.forma]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatarDataHora(r.registradoEm)} · {r.registradoPor}
                      {r.motivo ? ` · ${r.motivo}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatarBRL(r.valorCentavos)}</span>
                    {r.tipo === "recebimento" &&
                      (recebimentoEstornado(estado, r) ? (
                        <Etiqueta tom="perigo">Estornado</Etiqueta>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!turno}
                          onClick={() => {
                            setErroModal(null);
                            setMotivo("");
                            setEstornando(r.id);
                          }}
                        >
                          Estornar
                        </Button>
                      ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t pt-2">
            <Linha rotulo="Recebido">{formatarBRL(recebidoComanda(estado, comanda.id))}</Linha>
            <Linha rotulo="A receber" forte>
              {formatarBRL(aReceber)}
            </Linha>
          </div>
        </Card>
      </div>

      <Modal aberto={!!cancelando} aoFechar={() => setCancelando(null)} titulo="Cancelar item">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            O item continua no histórico, marcado como cancelado.
          </p>
          <Campo rotulo="Motivo">
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: pedido errado" />
          </Campo>
          {erroModal && <Mensagem tipo="erro">{erroModal}</Mensagem>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCancelando(null)}>
              Voltar
            </Button>
            <Button onClick={confirmarCancelamento}>Cancelar item</Button>
          </div>
        </div>
      </Modal>

      <Modal aberto={recebendo} aoFechar={() => setRecebendo(false)} titulo="Receber pagamento">
        <div className="space-y-4">
          <Campo rotulo="Forma de pagamento">
            <Selecao value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
              {FORMAS.map((f) => (
                <option key={f} value={f}>
                  {ROTULO_FORMA[f]}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Valor" dica="Pode ser parcial; o restante continua a receber.">
            <Input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
          </Campo>
          {erroModal && <Mensagem tipo="erro">{erroModal}</Mensagem>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRecebendo(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarRecebimento}>Registrar</Button>
          </div>
        </div>
      </Modal>

      <Modal aberto={!!estornando} aoFechar={() => setEstornando(null)} titulo="Estornar recebimento">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            O estorno entra no turno de caixa aberto agora.
          </p>
          <Campo rotulo="Motivo">
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: forma de pagamento errada" />
          </Campo>
          {erroModal && <Mensagem tipo="erro">{erroModal}</Mensagem>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEstornando(null)}>
              Voltar
            </Button>
            <Button onClick={confirmarEstorno}>Estornar</Button>
          </div>
        </div>
      </Modal>
    </Pagina>
  );
}
