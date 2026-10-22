"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { receberConta } from "@/lib/contabar/acoes";
import {
  centavosParaTexto,
  formatarBRL,
  formatarDataHora,
  paraCentavos,
} from "@/lib/contabar/dinheiro";
import { useLoja } from "@/lib/contabar/loja";
import {
  extratoCliente,
  nomeCliente,
  saldoCliente,
  turnoAberto,
} from "@/lib/contabar/regras";
import type { FormaPagamento } from "@/lib/contabar/tipos";
import { FORMAS, ROTULO_FORMA } from "@/lib/contabar/tipos";
import { Campo, Estatistica, Etiqueta, Mensagem, Modal, Pagina, Selecao, Vazio } from "./ui";

const ROTULO_TIPO = {
  consumo: "Consumo",
  cancelamento: "Cancelamento",
  pagamento: "Pagamento",
  estorno_de_pagamento: "Estorno de pagamento",
} as const;

export function TelaFiadoCliente() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const { estado, executar } = useLoja();
  const [pagando, setPagando] = useState(false);
  const [forma, setForma] = useState<FormaPagamento>("dinheiro");
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const cliente = estado.clientes.find((c) => c.id === clienteId);
  if (!cliente) {
    return (
      <Pagina titulo="Cliente não encontrado">
        <Vazio>
          <Link href="/painel/fiado" className="underline underline-offset-4">
            Voltar para o fiado
          </Link>
        </Vazio>
      </Pagina>
    );
  }

  const saldo = saldoCliente(estado, cliente.id);
  const extrato = extratoCliente(estado, cliente.id);
  const turno = turnoAberto(estado);
  const fiadoLigado = estado.configuracoes.fiadoAtivo;

  function abrirPagamento() {
    setErro(null);
    setSucesso(null);
    setForma("dinheiro");
    setValor(saldo > 0 ? centavosParaTexto(saldo) : "");
    setPagando(true);
  }

  function confirmar() {
    setErro(null);
    const centavos = paraCentavos(valor);
    if (centavos === null || centavos <= 0) {
      setErro("Informe um valor válido");
      return;
    }
    const r = executar((e) =>
      receberConta(e, { clienteId: cliente!.id, forma, valorCentavos: centavos }),
    );
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setPagando(false);
    setSucesso(`Pagamento de ${formatarBRL(centavos)} registrado.`);
  }

  return (
    <Pagina
      titulo={nomeCliente(cliente)}
      descricao={cliente.telefone ? `Telefone: ${cliente.telefone}` : undefined}
      acoes={
        <>
          <Button asChild variant="outline">
            <Link href="/painel/fiado">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Fiado
            </Link>
          </Button>
          <Button onClick={abrirPagamento} disabled={!turno}>
            Receber pagamento
          </Button>
        </>
      }
    >
      {!fiadoLigado && (
        <Mensagem tipo="aviso">
          O fiado está desligado neste bar. Esta conta não recebe novos consumos, mas o
          saldo antigo continua aqui e pode ser pago.
        </Mensagem>
      )}
      {!turno && (
        <Mensagem tipo="aviso">
          Para receber um pagamento é preciso um turno de caixa aberto, porque o dinheiro
          passa pelo caixa.{" "}
          <Link href="/painel/caixa" className="font-semibold underline underline-offset-4">
            Abrir o caixa
          </Link>
        </Mensagem>
      )}
      {sucesso && <Mensagem tipo="ok">{sucesso}</Mensagem>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Estatistica
          titulo={saldo < 0 ? "Crédito do cliente" : "Saldo devedor"}
          valor={formatarBRL(Math.abs(saldo))}
          tom={saldo > 0 ? "alerta" : "ok"}
          detalhe="Calculado a partir do extrato abaixo"
        />
        <Estatistica titulo="Movimentos" valor={String(extrato.length)} />
      </div>

      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">Extrato da conta</h2>
        {extrato.length === 0 ? (
          <Vazio>Sem movimentos nesta conta.</Vazio>
        ) : (
          <ul className="divide-y">
            {[...extrato].reverse().map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div>
                  <p className="font-medium">
                    {l.descricao}{" "}
                    <Etiqueta tom={l.efeitoCentavos > 0 ? "alerta" : "ok"}>
                      {ROTULO_TIPO[l.tipo]}
                    </Etiqueta>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatarDataHora(l.quando)} · {l.quem}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {l.efeitoCentavos > 0 ? "+" : "−"}
                    {formatarBRL(Math.abs(l.efeitoCentavos))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Saldo: {formatarBRL(l.saldoAposCentavos)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal aberto={pagando} aoFechar={() => setPagando(false)} titulo="Receber pagamento da conta">
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
          <Campo
            rotulo="Valor"
            dica={
              estado.configuracoes.permitePagamentoAMaior
                ? "Pode pagar parte da dívida. Pagamento acima da dívida vira crédito."
                : "Pode pagar parte da dívida, mas não mais do que o saldo devedor."
            }
          >
            <Input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
          </Campo>
          {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPagando(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmar}>Registrar pagamento</Button>
          </div>
        </div>
      </Modal>
    </Pagina>
  );
}
