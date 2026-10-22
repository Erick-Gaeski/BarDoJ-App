import type {
  Destino,
  Estado,
  FormaPagamento,
  ItemComanda,
  MovimentoCaixa,
  Produto,
  Recebimento,
  TurnoCaixa,
} from "./tipos";
import { FORMAS, NOME_PERFIL, VERSAO_ESTADO } from "./tipos";
import { resumoTurno } from "./regras";

/**
 * DADOS DE EXEMPLO (TEMPORÁRIOS).
 *
 * Tudo aqui é fictício e existe só para mostrar as telas enquanto o banco do
 * Supabase não é migrado. Nada disto é gravado no Supabase.
 */

const ADM = NOME_PERFIL.administrador;
const GARCOM = NOME_PERFIL.garcom;
const OUTRO_GARCOM = "Outro garçom (exemplo)";

export function criarEstadoExemplo(): Estado {
  const base = Date.now();
  const quando = (horasAtras: number) =>
    new Date(base - horasAtras * 3_600_000).toISOString();

  const produtos: Produto[] = [
    { id: "prod-cerveja", nome: "Cerveja long neck", precoCentavos: 1200, ativo: true },
    { id: "prod-chopp", nome: "Chopp", precoCentavos: 900, ativo: true },
    { id: "prod-refri", nome: "Refrigerante", precoCentavos: 600, ativo: true },
    { id: "prod-agua", nome: "Água", precoCentavos: 400, ativo: true },
    { id: "prod-suco", nome: "Suco natural", precoCentavos: 900, ativo: true },
    { id: "prod-caipirinha", nome: "Caipirinha", precoCentavos: 1800, ativo: true },
    { id: "prod-dose", nome: "Dose de cachaça", precoCentavos: 800, ativo: true },
    { id: "prod-fritas", nome: "Porção de fritas", precoCentavos: 2800, ativo: true },
    { id: "prod-calabresa", nome: "Porção de calabresa", precoCentavos: 3200, ativo: true },
    { id: "prod-espetinho", nome: "Espetinho", precoCentavos: 1000, ativo: true },
    { id: "prod-prato", nome: "Prato do dia", precoCentavos: 3500, ativo: false },
  ];
  const preco = (id: string) =>
    produtos.find((p) => p.id === id)?.precoCentavos ?? 0;

  const clientes = [
    { id: "cli-joao", nome: "João Exemplo", apelido: "Joãozinho", telefone: "(00) 90000-0001", ativo: true },
    { id: "cli-maria", nome: "Maria Exemplo", apelido: undefined, telefone: "(00) 90000-0002", ativo: true },
    { id: "cli-carlos", nome: "Carlos Exemplo", apelido: undefined, telefone: undefined, ativo: true },
    { id: "cli-ana", nome: "Ana Exemplo", apelido: "Aninha", telefone: undefined, ativo: true },
  ];

  const itens: ItemComanda[] = [];
  let seqItem = 0;
  const lancar = (
    comandaId: string,
    produtoId: string,
    quantidade: number,
    destino: Destino,
    horasAtras: number,
    por: string,
    clienteId?: string,
  ) => {
    seqItem += 1;
    itens.push({
      id: `it-ex-${seqItem}`,
      comandaId,
      tipo: "item",
      produtoId,
      quantidade,
      precoUnitarioCentavos: preco(produtoId),
      valorCentavos: quantidade * preco(produtoId),
      destino,
      clienteId: destino === "conta" ? clienteId : undefined,
      registradoPor: por,
      registradoEm: quando(horasAtras),
    });
  };

  const recebimentos: Recebimento[] = [];
  const receber = (
    turnoId: string,
    origem: "comanda" | "conta",
    forma: FormaPagamento,
    valorCentavos: number,
    horasAtras: number,
    alvo: { comandaId?: string; clienteId?: string },
  ) => {
    recebimentos.push({
      id: `rec-ex-${recebimentos.length + 1}`,
      turnoId,
      tipo: "recebimento",
      origem,
      comandaId: alvo.comandaId,
      clienteId: alvo.clienteId,
      forma,
      valorCentavos,
      registradoPor: ADM,
      registradoEm: quando(horasAtras),
    });
  };

  // ----- turno de ontem (fechado) ---------------------------------------
  lancar("cmd-ex-a", "prod-chopp", 4, "avista", 28, GARCOM);
  lancar("cmd-ex-a", "prod-fritas", 1, "avista", 28, GARCOM);
  receber("trn-ex-0", "comanda", "dinheiro", 4 * 900 + 2800, 26, { comandaId: "cmd-ex-a" });

  lancar("cmd-ex-b", "prod-caipirinha", 2, "avista", 27, GARCOM);
  lancar("cmd-ex-b", "prod-cerveja", 6, "avista", 27, GARCOM);
  receber("trn-ex-0", "comanda", "pix", 2 * 1800 + 6 * 1200, 26, { comandaId: "cmd-ex-b" });

  lancar("cmd-ex-c", "prod-agua", 1, "avista", 27, ADM);
  lancar("cmd-ex-c", "prod-refri", 1, "avista", 27, ADM);
  receber("trn-ex-0", "comanda", "cartao", 400 + 600, 27, { comandaId: "cmd-ex-c" });

  lancar("cmd-ex-d", "prod-cerveja", 3, "conta", 28, GARCOM, "cli-joao");
  lancar("cmd-ex-d", "prod-calabresa", 1, "conta", 28, GARCOM, "cli-joao");

  lancar("cmd-ex-e", "prod-fritas", 1, "conta", 27, GARCOM, "cli-maria");
  lancar("cmd-ex-e", "prod-refri", 1, "conta", 27, GARCOM, "cli-maria");
  lancar("cmd-ex-e", "prod-agua", 1, "conta", 27, GARCOM, "cli-maria");

  receber("trn-ex-0", "conta", "dinheiro", 2000, 25, { clienteId: "cli-joao" });

  // ----- turno de hoje (aberto) -----------------------------------------
  lancar("cmd-ex-f", "prod-chopp", 2, "avista", 1.5, GARCOM);
  lancar("cmd-ex-f", "prod-fritas", 1, "avista", 1.4, GARCOM);

  lancar("cmd-ex-g", "prod-cerveja", 2, "conta", 1, GARCOM, "cli-joao");
  lancar("cmd-ex-g", "prod-espetinho", 1, "conta", 0.9, GARCOM, "cli-joao");

  lancar("cmd-ex-h", "prod-caipirinha", 1, "avista", 0.5, OUTRO_GARCOM);

  lancar("cmd-ex-i", "prod-caipirinha", 1, "avista", 2, ADM);
  receber("trn-ex-1", "comanda", "pix", 1800, 2, { comandaId: "cmd-ex-i" });

  receber("trn-ex-1", "conta", "pix", 1000, 1, { clienteId: "cli-maria" });

  const movimentos: MovimentoCaixa[] = [
    {
      id: "mov-ex-1",
      turnoId: "trn-ex-1",
      tipo: "suprimento",
      valorCentavos: 5000,
      motivo: "Troco extra (exemplo)",
      registradoPor: ADM,
      registradoEm: quando(3),
    },
  ];

  const turnoOntem: TurnoCaixa = {
    id: "trn-ex-0",
    fundoInicialCentavos: 10000,
    abertoPor: ADM,
    abertoEm: quando(30),
  };
  const turnoHoje: TurnoCaixa = {
    id: "trn-ex-1",
    fundoInicialCentavos: 15000,
    abertoPor: ADM,
    abertoEm: quando(4),
  };

  const comandas = [
    { id: "cmd-ex-a", rotulo: "Mesa 2", abertaPor: GARCOM, abertaEm: quando(28), encerradaPor: ADM, encerradaEm: quando(26) },
    { id: "cmd-ex-b", rotulo: "Mesa 5", abertaPor: GARCOM, abertaEm: quando(27), encerradaPor: ADM, encerradaEm: quando(26) },
    { id: "cmd-ex-c", rotulo: "Balcão", abertaPor: ADM, abertaEm: quando(27), encerradaPor: ADM, encerradaEm: quando(27) },
    { id: "cmd-ex-d", rotulo: "Mesa 9", clienteId: "cli-joao", abertaPor: GARCOM, abertaEm: quando(28), encerradaPor: ADM, encerradaEm: quando(26) },
    { id: "cmd-ex-e", rotulo: "Mesa 4", clienteId: "cli-maria", abertaPor: GARCOM, abertaEm: quando(27), encerradaPor: ADM, encerradaEm: quando(26) },
    { id: "cmd-ex-f", rotulo: "Mesa 3", abertaPor: GARCOM, abertaEm: quando(1.6) },
    { id: "cmd-ex-g", rotulo: "Mesa 7", clienteId: "cli-joao", abertaPor: GARCOM, abertaEm: quando(1.1) },
    { id: "cmd-ex-h", rotulo: "Mesa 8", abertaPor: OUTRO_GARCOM, abertaEm: quando(0.6) },
    { id: "cmd-ex-i", rotulo: "Balcão", abertaPor: ADM, abertaEm: quando(2.1), encerradaPor: ADM, encerradaEm: quando(2) },
  ];

  const parcial: Estado = {
    versao: VERSAO_ESTADO,
    perfil: null,
    estabelecimentoNome: "Bar de Exemplo",
    configuracoes: {
      fiadoAtivo: true,
      garcomVeTelefone: false,
      garcomVeTodasComandasAbertas: false,
      garcomCadastraClientes: false,
      permitePagamentoAMaior: true,
    },
    produtos,
    clientes,
    comandas,
    itens,
    recebimentos,
    turnos: [turnoOntem, turnoHoje],
    movimentos,
  };

  // Fecha o turno de ontem com uma diferença de R$ 5,00 a menos no dinheiro,
  // para mostrar como a diferença aparece.
  const fechamento = resumoTurno(parcial, "trn-ex-0").map((l) => ({
    forma: l.forma,
    esperadoCentavos: l.esperadoCentavos,
    contadoCentavos: l.forma === "dinheiro" ? l.esperadoCentavos - 500 : l.esperadoCentavos,
    diferencaCentavos: l.forma === "dinheiro" ? -500 : 0,
  }));
  void FORMAS;

  return {
    ...parcial,
    turnos: [
      { ...turnoOntem, fechadoEm: quando(24), fechadoPor: ADM, fechamento },
      turnoHoje,
    ],
  };
}
