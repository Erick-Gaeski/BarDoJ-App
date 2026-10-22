/**
 * Tipos do ContaBar.
 *
 * ATENÇÃO: enquanto o banco do Supabase não for migrado, o sistema usa DADOS DE
 * EXEMPLO guardados só no navegador (ver lib/contabar/loja.tsx). Estes tipos
 * espelham o modelo proposto para o banco: itens da comanda, recebimentos,
 * turnos de caixa e conta (fiado) do cliente derivada de itens e recebimentos.
 */

export type Perfil = "administrador" | "garcom";
export type FormaPagamento = "dinheiro" | "pix" | "cartao" | "outro";
/** avista = pago no caixa; conta = fiado (conta contínua do cliente) */
export type Destino = "avista" | "conta";

export const FORMAS: FormaPagamento[] = ["dinheiro", "pix", "cartao", "outro"];

export const ROTULO_FORMA: Record<FormaPagamento, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao: "Cartão",
  outro: "Outro",
};

export const NOME_PERFIL: Record<Perfil, string> = {
  administrador: "Administrador (exemplo)",
  garcom: "Garçom (exemplo)",
};

/** Mudar este número descarta os dados de exemplo salvos no navegador. */
export const VERSAO_ESTADO = 1;

export interface Configuracoes {
  fiadoAtivo: boolean;
  garcomVeTelefone: boolean;
  garcomVeTodasComandasAbertas: boolean;
  garcomCadastraClientes: boolean;
  permitePagamentoAMaior: boolean;
}

export interface Produto {
  id: string;
  nome: string;
  precoCentavos: number;
  ativo: boolean;
}

export interface Cliente {
  id: string;
  nome: string;
  apelido?: string;
  telefone?: string;
  ativo: boolean;
}

export interface Comanda {
  id: string;
  clienteId?: string;
  rotulo?: string;
  abertaPor: string;
  abertaEm: string;
  encerradaPor?: string;
  encerradaEm?: string;
}

/** Cancelamento = novo item com valores negativos que aponta para o original. */
export interface ItemComanda {
  id: string;
  comandaId: string;
  tipo: "item" | "cancelamento";
  produtoId: string;
  quantidade: number;
  precoUnitarioCentavos: number;
  valorCentavos: number;
  destino: Destino;
  clienteId?: string;
  estornoDe?: string;
  motivo?: string;
  registradoPor: string;
  registradoEm: string;
}

/** Dinheiro que entrou no caixa. Estorno = novo recebimento negativo. */
export interface Recebimento {
  id: string;
  turnoId: string;
  tipo: "recebimento" | "estorno";
  origem: "comanda" | "conta";
  comandaId?: string;
  clienteId?: string;
  forma: FormaPagamento;
  valorCentavos: number;
  estornoDe?: string;
  motivo?: string;
  registradoPor: string;
  registradoEm: string;
}

export interface FechamentoForma {
  forma: FormaPagamento;
  esperadoCentavos: number;
  contadoCentavos: number;
  diferencaCentavos: number;
}

export interface TurnoCaixa {
  id: string;
  fundoInicialCentavos: number;
  abertoPor: string;
  abertoEm: string;
  fechadoPor?: string;
  fechadoEm?: string;
  fechamento?: FechamentoForma[];
}

export interface MovimentoCaixa {
  id: string;
  turnoId: string;
  tipo: "suprimento" | "sangria";
  valorCentavos: number;
  motivo: string;
  registradoPor: string;
  registradoEm: string;
}

export interface Estado {
  versao: number;
  perfil: Perfil | null;
  estabelecimentoNome: string;
  configuracoes: Configuracoes;
  produtos: Produto[];
  clientes: Cliente[];
  comandas: Comanda[];
  itens: ItemComanda[];
  recebimentos: Recebimento[];
  turnos: TurnoCaixa[];
  movimentos: MovimentoCaixa[];
}

export type ResultadoAcao<T> =
  | { ok: true; estado: Estado; valor: T }
  | { ok: false; erro: string };
