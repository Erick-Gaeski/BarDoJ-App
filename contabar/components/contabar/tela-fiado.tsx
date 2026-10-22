"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { salvarCliente } from "@/lib/contabar/acoes";
import { formatarBRL, formatarDataHora } from "@/lib/contabar/dinheiro";
import { useLoja } from "@/lib/contabar/loja";
import {
  existemDividas,
  nomeCliente,
  saldoCliente,
  totalAReceberContas,
  extratoCliente,
} from "@/lib/contabar/regras";
import { Campo, Estatistica, Etiqueta, Mensagem, Modal, Pagina, Vazio } from "./ui";

/**
 * Contas dos clientes (fiado). Opcional por bar: com o fiado desligado, a tela
 * continua acessível enquanto existirem dívidas antigas, que podem ser pagas.
 */
export function TelaFiado() {
  const { estado, executar } = useLoja();
  const fiadoLigado = estado.configuracoes.fiadoAtivo;
  const temDividas = existemDividas(estado);

  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [novoAberto, setNovoAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  if (!fiadoLigado && !temDividas) {
    return (
      <Pagina titulo="Fiado">
        <Mensagem tipo="info">
          Este bar não trabalha com fiado e não há dívidas antigas. Para ligar o fiado,
          vá em{" "}
          <Link href="/painel/configuracoes" className="font-semibold underline underline-offset-4">
            Configurações
          </Link>
          .
        </Mensagem>
      </Pagina>
    );
  }

  const linhas = estado.clientes
    .map((c) => ({ cliente: c, saldo: saldoCliente(estado, c.id) }))
    .filter((l) => mostrarTodos || l.saldo !== 0)
    .sort((a, b) => b.saldo - a.saldo);

  function criar() {
    setErro(null);
    const r = executar((e) => salvarCliente(e, { nome, apelido, telefone }));
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setNovoAberto(false);
    setNome("");
    setApelido("");
    setTelefone("");
    setMostrarTodos(true);
  }

  return (
    <Pagina
      titulo="Fiado"
      descricao="Conta contínua de cada cliente, separada do caixa. O saldo é sempre calculado a partir do histórico."
      acoes={
        fiadoLigado ? (
          <Button onClick={() => setNovoAberto(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Novo cliente
          </Button>
        ) : undefined
      }
    >
      {fiadoLigado ? (
        <Mensagem tipo="ok">Fiado ligado: o bar pode lançar consumo na conta do cliente.</Mensagem>
      ) : (
        <Mensagem tipo="aviso">
          <strong>Fiado desligado.</strong> Novas vendas não podem virar fiado. As dívidas
          antigas abaixo continuam visíveis e podem ser pagas normalmente.
        </Mensagem>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Estatistica
          titulo="Total a receber"
          valor={formatarBRL(totalAReceberContas(estado))}
          tom={totalAReceberContas(estado) > 0 ? "alerta" : "normal"}
        />
        <Estatistica
          titulo="Clientes com dívida"
          valor={String(estado.clientes.filter((c) => saldoCliente(estado, c.id) > 0).length)}
        />
        <Estatistica titulo="Clientes cadastrados" valor={String(estado.clientes.length)} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={mostrarTodos}
          onChange={(e) => setMostrarTodos(e.target.checked)}
        />
        Mostrar também clientes sem saldo
      </label>

      {linhas.length === 0 ? (
        <Vazio>Nenhum cliente com saldo.</Vazio>
      ) : (
        <div className="grid gap-3">
          {linhas.map(({ cliente, saldo }) => {
            const extrato = extratoCliente(estado, cliente.id);
            const ultimo = extrato[extrato.length - 1];
            return (
              <Link key={cliente.id} href={`/painel/fiado/${cliente.id}`}>
                <Card className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-accent/50">
                  <div>
                    <p className="font-semibold">{nomeCliente(cliente)}</p>
                    <p className="text-xs text-muted-foreground">
                      {ultimo ? `Último movimento: ${formatarDataHora(ultimo.quando)}` : "Sem movimentos"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {saldo > 0 && <Etiqueta tom="alerta">Deve</Etiqueta>}
                    {saldo < 0 && <Etiqueta tom="info">Crédito</Etiqueta>}
                    <span className="text-lg font-bold">{formatarBRL(Math.abs(saldo))}</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Modal aberto={novoAberto} aoFechar={() => setNovoAberto(false)} titulo="Novo cliente">
        <div className="space-y-4">
          <Campo rotulo="Nome">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>
          <Campo rotulo="Apelido (opcional)" dica="Ajuda a distinguir clientes com o mesmo nome.">
            <Input value={apelido} onChange={(e) => setApelido(e.target.value)} />
          </Campo>
          <Campo rotulo="Telefone (opcional)">
            <Input inputMode="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </Campo>
          {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNovoAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={criar}>Cadastrar</Button>
          </div>
        </div>
      </Modal>
    </Pagina>
  );
}
