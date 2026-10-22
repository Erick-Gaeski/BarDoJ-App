"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { abrirComanda } from "@/lib/contabar/acoes";
import { formatarBRL, formatarDataHora } from "@/lib/contabar/dinheiro";
import { useLoja } from "@/lib/contabar/loja";
import {
  aReceberComanda,
  nomeCliente,
  recebidoComanda,
  rotuloComanda,
  totalAvista,
  totalConta,
} from "@/lib/contabar/regras";
import { Campo, Etiqueta, Mensagem, Modal, Pagina, Selecao, Vazio } from "./ui";

type Filtro = "abertas" | "encerradas" | "diferenca" | "todas";

const FILTROS: Array<{ id: Filtro; rotulo: string }> = [
  { id: "abertas", rotulo: "Abertas" },
  { id: "encerradas", rotulo: "Encerradas" },
  { id: "diferenca", rotulo: "Com diferença" },
  { id: "todas", rotulo: "Todas" },
];

export function TelaComandas() {
  const { estado, executar } = useLoja();
  const router = useRouter();
  const parametros = useSearchParams();
  const inicial = parametros.get("filtro");
  const [filtro, setFiltro] = useState<Filtro>(
    FILTROS.some((f) => f.id === inicial) ? (inicial as Filtro) : "abertas",
  );
  const [novaAberta, setNovaAberta] = useState(false);
  const [rotulo, setRotulo] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const comandas = estado.comandas
    .filter((c) => {
      if (filtro === "abertas") return !c.encerradaEm;
      if (filtro === "encerradas") return !!c.encerradaEm;
      if (filtro === "diferenca") return !!c.encerradaEm && aReceberComanda(estado, c.id) !== 0;
      return true;
    })
    .sort((a, b) => b.abertaEm.localeCompare(a.abertaEm));

  function criar() {
    setErro(null);
    const r = executar((e) =>
      abrirComanda(e, { rotulo, clienteId: clienteId || undefined }),
    );
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setNovaAberta(false);
    setRotulo("");
    setClienteId("");
    router.push(`/painel/comandas/${r.valor}`);
  }

  return (
    <Pagina
      titulo="Comandas"
      descricao="Acompanhe o que cada mesa ou cliente consumiu e o que falta receber."
      acoes={
        <Button onClick={() => setNovaAberta(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Nova comanda
        </Button>
      }
    >
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtro de comandas">
        {FILTROS.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={filtro === f.id ? "default" : "outline"}
            onClick={() => setFiltro(f.id)}
            role="tab"
            aria-selected={filtro === f.id}
          >
            {f.rotulo}
          </Button>
        ))}
      </div>

      {comandas.length === 0 ? (
        <Vazio>Nenhuma comanda neste filtro.</Vazio>
      ) : (
        <div className="grid gap-3">
          {comandas.map((c) => {
            const aReceber = aReceberComanda(estado, c.id);
            return (
              <Link key={c.id} href={`/painel/comandas/${c.id}`}>
                <Card className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-accent/50">
                  <div className="min-w-0">
                    <p className="font-semibold">{rotuloComanda(estado, c)}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.abertaPor} · aberta em {formatarDataHora(c.abertaEm)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {c.encerradaEm ? <Etiqueta>Encerrada</Etiqueta> : <Etiqueta tom="info">Aberta</Etiqueta>}
                    {totalConta(estado, c.id) > 0 && (
                      <Etiqueta tom="alerta">Na conta {formatarBRL(totalConta(estado, c.id))}</Etiqueta>
                    )}
                    {c.encerradaEm && aReceber !== 0 ? (
                      <Etiqueta tom="perigo">Diferença {formatarBRL(aReceber)}</Etiqueta>
                    ) : (
                      !c.encerradaEm &&
                      aReceber > 0 && <Etiqueta tom="alerta">Receber {formatarBRL(aReceber)}</Etiqueta>
                    )}
                    <span className="text-sm text-muted-foreground">
                      À vista {formatarBRL(totalAvista(estado, c.id))} · recebido{" "}
                      {formatarBRL(recebidoComanda(estado, c.id))}
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Modal aberto={novaAberta} aoFechar={() => setNovaAberta(false)} titulo="Nova comanda">
        <div className="space-y-4">
          <Campo rotulo="Mesa ou identificação (opcional)">
            <Input
              value={rotulo}
              onChange={(e) => setRotulo(e.target.value)}
              placeholder="Ex.: Mesa 4"
            />
          </Campo>
          <Campo
            rotulo="Cliente (opcional)"
            dica={
              estado.configuracoes.fiadoAtivo
                ? "Necessário para lançar itens na conta (fiado)."
                : "O fiado está desligado neste bar; o cliente é só uma identificação."
            }
          >
            <Selecao value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Sem cliente</option>
              {estado.clientes
                .filter((c) => c.ativo)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {nomeCliente(c)}
                  </option>
                ))}
            </Selecao>
          </Campo>
          {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNovaAberta(false)}>
              Cancelar
            </Button>
            <Button onClick={criar}>Abrir comanda</Button>
          </div>
        </div>
      </Modal>
    </Pagina>
  );
}
