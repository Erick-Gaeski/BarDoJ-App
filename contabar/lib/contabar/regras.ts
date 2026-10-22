import type {
  Cliente,
  Comanda,
  Estado,
  FormaPagamento,
  ItemComanda,
  Recebimento,
  TurnoCaixa,
} from "./tipos";
import { FORMAS, ROTULO_FORMA } from "./tipos";

/**
 * Regras de cálculo do ContaBar (funções puras sobre o Estado).
 * Espelham as regras do SQL proposto: saldo nunca é digitado, sempre calculado.
 */

const soma = (valores: number[]) => valores.reduce((s, v) => s + v, 0);

// ---------------------------------------------------------------- comandas

export function totalAvista(e: Estado, comandaId: string): number {
  return soma(
    e.itens
      .filter((i) => i.comandaId === comandaId && i.destino === "avista")
      .map((i) => i.valorCentavos),
  );
}

export function totalConta(e: Estado, comandaId: string): number {
  return soma(
    e.itens
      .filter((i) => i.comandaId === comandaId && i.destino === "conta")
      .map((i) => i.valorCentavos),
  );
}

export function totalGeral(e: Estado, comandaId: string): number {
  return totalAvista(e, comandaId) + totalConta(e, comandaId);
}

export function recebidoComanda(e: Estado, comandaId: string): number {
  return soma(
    e.recebimentos
      .filter((r) => r.origem === "comanda" && r.comandaId === comandaId)
      .map((r) => r.valorCentavos),
  );
}

/** Positivo: falta receber. Negativo: recebido a mais (precisa devolver/estornar). */
export function aReceberComanda(e: Estado, comandaId: string): number {
  return totalAvista(e, comandaId) - recebidoComanda(e, comandaId);
}

export function itensComStatus(
  e: Estado,
  comandaId: string,
): Array<ItemComanda & { cancelado: boolean }> {
  const cancelados = new Set(
    e.itens
      .filter((i) => i.tipo === "cancelamento" && i.comandaId === comandaId)
      .map((i) => i.estornoDe),
  );
  return e.itens
    .filter((i) => i.comandaId === comandaId && i.tipo === "item")
    .map((i) => ({ ...i, cancelado: cancelados.has(i.id) }));
}

export function recebimentosDaComanda(e: Estado, comandaId: string): Recebimento[] {
  return e.recebimentos.filter(
    (r) => r.origem === "comanda" && r.comandaId === comandaId,
  );
}

export function recebimentoEstornado(e: Estado, r: Recebimento): boolean {
  return e.recebimentos.some((x) => x.tipo === "estorno" && x.estornoDe === r.id);
}

export function nomeProduto(e: Estado, produtoId: string): string {
  return e.produtos.find((p) => p.id === produtoId)?.nome ?? "Produto removido";
}

export function nomeCliente(c: Cliente): string {
  return c.apelido ? `${c.nome} (${c.apelido})` : c.nome;
}

export function rotuloComanda(e: Estado, c: Comanda): string {
  const cliente = c.clienteId
    ? e.clientes.find((x) => x.id === c.clienteId)
    : undefined;
  if (c.rotulo && cliente) return `${c.rotulo} · ${cliente.nome}`;
  if (c.rotulo) return c.rotulo;
  if (cliente) return cliente.nome;
  return "Sem identificação";
}

/** O garçom só enxerga comandas abertas: as dele, ou todas se o bar ativou. */
export function comandaVisivelParaGarcom(
  e: Estado,
  c: Comanda,
  nomeUsuario: string,
): boolean {
  if (c.encerradaEm) return false;
  return c.abertaPor === nomeUsuario || e.configuracoes.garcomVeTodasComandasAbertas;
}

// ------------------------------------------------------------ conta (fiado)

/** Consumo na conta menos pagamentos de conta. Positivo = cliente deve. */
export function saldoCliente(e: Estado, clienteId: string): number {
  const consumo = soma(
    e.itens
      .filter((i) => i.destino === "conta" && i.clienteId === clienteId)
      .map((i) => i.valorCentavos),
  );
  const pagamentos = soma(
    e.recebimentos
      .filter((r) => r.origem === "conta" && r.clienteId === clienteId)
      .map((r) => r.valorCentavos),
  );
  return consumo - pagamentos;
}

export function totalAReceberContas(e: Estado): number {
  return soma(
    e.clientes.map((c) => Math.max(saldoCliente(e, c.id), 0)),
  );
}

export function existemDividas(e: Estado): boolean {
  return e.clientes.some((c) => saldoCliente(e, c.id) > 0);
}

export interface LinhaExtrato {
  id: string;
  quando: string;
  tipo: "consumo" | "cancelamento" | "pagamento" | "estorno_de_pagamento";
  descricao: string;
  /** Positivo aumenta a dívida; negativo diminui. */
  efeitoCentavos: number;
  quem: string;
  saldoAposCentavos: number;
}

export function extratoCliente(e: Estado, clienteId: string): LinhaExtrato[] {
  const base: Array<Omit<LinhaExtrato, "saldoAposCentavos">> = [
    ...e.itens
      .filter((i) => i.destino === "conta" && i.clienteId === clienteId)
      .map((i) => ({
        id: i.id,
        quando: i.registradoEm,
        tipo: (i.tipo === "item" ? "consumo" : "cancelamento") as LinhaExtrato["tipo"],
        descricao: `${nomeProduto(e, i.produtoId)} × ${Math.abs(i.quantidade)}`,
        efeitoCentavos: i.valorCentavos,
        quem: i.registradoPor,
      })),
    ...e.recebimentos
      .filter((r) => r.origem === "conta" && r.clienteId === clienteId)
      .map((r) => ({
        id: r.id,
        quando: r.registradoEm,
        tipo: (r.tipo === "recebimento"
          ? "pagamento"
          : "estorno_de_pagamento") as LinhaExtrato["tipo"],
        descricao: `Pagamento (${ROTULO_FORMA[r.forma]})`,
        efeitoCentavos: -r.valorCentavos,
        quem: r.registradoPor,
      })),
  ].sort((a, b) => a.quando.localeCompare(b.quando));

  let acumulado = 0;
  return base.map((linha) => {
    acumulado += linha.efeitoCentavos;
    return { ...linha, saldoAposCentavos: acumulado };
  });
}

// -------------------------------------------------------------------- caixa

export function turnoAberto(e: Estado): TurnoCaixa | undefined {
  return e.turnos.find((t) => !t.fechadoEm);
}

export interface LinhaResumo {
  forma: FormaPagamento;
  fundoCentavos: number;
  vendasCentavos: number;
  contasCentavos: number;
  ajustesCentavos: number;
  esperadoCentavos: number;
}

/**
 * Esperado do turno por forma de pagamento.
 * Dinheiro = fundo inicial + recebimentos + suprimentos - sangrias.
 * Demais formas = soma dos recebimentos. A conta (fiado) só entra aqui quando
 * há pagamento real; consumo na conta nunca toca o caixa.
 */
export function resumoTurno(e: Estado, turnoId: string): LinhaResumo[] {
  const turno = e.turnos.find((t) => t.id === turnoId);
  const ajustes = soma(
    e.movimentos
      .filter((m) => m.turnoId === turnoId)
      .map((m) => (m.tipo === "suprimento" ? m.valorCentavos : -m.valorCentavos)),
  );
  return FORMAS.map((forma) => {
    const doTurno = e.recebimentos.filter(
      (r) => r.turnoId === turnoId && r.forma === forma,
    );
    const vendas = soma(
      doTurno.filter((r) => r.origem === "comanda").map((r) => r.valorCentavos),
    );
    const contas = soma(
      doTurno.filter((r) => r.origem === "conta").map((r) => r.valorCentavos),
    );
    const fundo = forma === "dinheiro" ? (turno?.fundoInicialCentavos ?? 0) : 0;
    const aj = forma === "dinheiro" ? ajustes : 0;
    return {
      forma,
      fundoCentavos: fundo,
      vendasCentavos: vendas,
      contasCentavos: contas,
      ajustesCentavos: aj,
      esperadoCentavos: fundo + vendas + contas + aj,
    };
  });
}

export function recebimentosDoTurno(e: Estado, turnoId: string): Recebimento[] {
  return e.recebimentos
    .filter((r) => r.turnoId === turnoId)
    .sort((a, b) => b.registradoEm.localeCompare(a.registradoEm));
}
