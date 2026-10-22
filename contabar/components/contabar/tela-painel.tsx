"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatarBRL, formatarDataHora } from "@/lib/contabar/dinheiro";
import { useLoja } from "@/lib/contabar/loja";
import {
  aReceberComanda,
  existemDividas,
  resumoTurno,
  rotuloComanda,
  totalAReceberContas,
  totalGeral,
  turnoAberto,
} from "@/lib/contabar/regras";
import { Estatistica, Etiqueta, Mensagem, Pagina, Vazio } from "./ui";

export function TelaPainel() {
  const { estado } = useLoja();
  const turno = turnoAberto(estado);
  const resumo = turno ? resumoTurno(estado, turno.id) : [];
  const recebidoTurno = resumo.reduce(
    (s, l) => s + l.vendasCentavos + l.contasCentavos,
    0,
  );
  const abertas = estado.comandas
    .filter((c) => !c.encerradaEm)
    .sort((a, b) => b.abertaEm.localeCompare(a.abertaEm));
  const aReceberAbertas = abertas.reduce(
    (s, c) => s + Math.max(aReceberComanda(estado, c.id), 0),
    0,
  );
  const divergentes = estado.comandas.filter(
    (c) => c.encerradaEm && aReceberComanda(estado, c.id) !== 0,
  );
  const fiadoLigado = estado.configuracoes.fiadoAtivo;
  const fiadoVisivel = fiadoLigado || existemDividas(estado);

  return (
    <Pagina titulo="Painel" descricao="Visão geral do bar agora.">
      {!turno && (
        <Mensagem tipo="aviso">
          O caixa está fechado. Para registrar vendas e recebimentos, abra um turno.{" "}
          <Link href="/painel/caixa" className="font-semibold underline underline-offset-4">
            Abrir o caixa
          </Link>
        </Mensagem>
      )}
      {divergentes.length > 0 && (
        <Mensagem tipo="erro">
          {divergentes.length} comanda(s) encerrada(s) com diferença entre o total e o
          recebido.{" "}
          <Link
            href="/painel/comandas?filtro=diferenca"
            className="font-semibold underline underline-offset-4"
          >
            Ver comandas com diferença
          </Link>
        </Mensagem>
      )}
      {!fiadoLigado && fiadoVisivel && (
        <Mensagem tipo="info">
          O fiado está desligado: novas vendas na conta não são permitidas, mas as
          dívidas antigas continuam visíveis e podem ser pagas.{" "}
          <Link href="/painel/fiado" className="font-semibold underline underline-offset-4">
            Ver contas
          </Link>
        </Mensagem>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Estatistica
          titulo="Caixa"
          valor={turno ? "Aberto" : "Fechado"}
          tom={turno ? "ok" : "alerta"}
          detalhe={turno ? `Desde ${formatarDataHora(turno.abertoEm)}` : "Nenhum turno aberto"}
        />
        <Estatistica
          titulo="Recebido no turno"
          valor={formatarBRL(recebidoTurno)}
          detalhe="Vendas e pagamentos de contas"
        />
        <Estatistica
          titulo="Comandas abertas"
          valor={String(abertas.length)}
          detalhe={`${formatarBRL(aReceberAbertas)} a receber (à vista)`}
        />
        {fiadoVisivel ? (
          <Estatistica
            titulo="Fiado a receber"
            valor={formatarBRL(totalAReceberContas(estado))}
            tom={totalAReceberContas(estado) > 0 ? "alerta" : "normal"}
            detalhe={fiadoLigado ? "Conta dos clientes" : "Fiado desligado (dívidas antigas)"}
          />
        ) : (
          <Estatistica titulo="Fiado" valor="Desligado" detalhe="Este bar não usa fiado" />
        )}
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Comandas abertas</h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/painel/comandas">Ver todas</Link>
          </Button>
        </div>
        {abertas.length === 0 ? (
          <Vazio>Nenhuma comanda aberta no momento.</Vazio>
        ) : (
          <ul className="divide-y">
            {abertas.slice(0, 8).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/painel/comandas/${c.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 hover:bg-accent/50"
                >
                  <div>
                    <p className="font-medium">{rotuloComanda(estado, c)}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.abertaPor} · {formatarDataHora(c.abertaEm)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {aReceberComanda(estado, c.id) > 0 && (
                      <Etiqueta tom="alerta">
                        Receber {formatarBRL(aReceberComanda(estado, c.id))}
                      </Etiqueta>
                    )}
                    <span className="font-semibold">{formatarBRL(totalGeral(estado, c.id))}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Pagina>
  );
}
