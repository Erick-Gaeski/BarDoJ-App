import type {
  Cliente,
  Comanda,
  Configuracoes,
  Destino,
  Estado,
  FechamentoForma,
  FormaPagamento,
  ItemComanda,
  MovimentoCaixa,
  Perfil,
  Produto,
  Recebimento,
  ResultadoAcao,
} from "./tipos";
import { FORMAS, NOME_PERFIL, ROTULO_FORMA } from "./tipos";
import {
  aReceberComanda,
  comandaVisivelParaGarcom,
  recebidoComanda,
  resumoTurno,
  saldoCliente,
  totalAvista,
  turnoAberto,
} from "./regras";

/**
 * Ações do ContaBar (funções puras: recebem o Estado e devolvem um novo).
 *
 * Cada ação aplica as mesmas regras que o banco aplicará depois (RLS e
 * gatilhos do SQL proposto), com as mesmas mensagens de erro. Quando o
 * Supabase estiver migrado, estas funções são trocadas por chamadas ao banco.
 */

let contador = 0;
export function novoId(prefixo: string): string {
  contador += 1;
  return `${prefixo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}${contador}`;
}

const agora = () => new Date().toISOString();

function falha(erro: string): { ok: false; erro: string } {
  return { ok: false, erro };
}

function sucesso<T>(estado: Estado, valor: T): ResultadoAcao<T> {
  return { ok: true, estado, valor };
}

export function nomeUsuario(e: Estado): string {
  return e.perfil ? NOME_PERFIL[e.perfil] : "Desconhecido";
}

function somenteAdministrador(e: Estado): string | null {
  return e.perfil === "administrador"
    ? null
    : "Somente o administrador pode fazer isso";
}

// ------------------------------------------------------------------ perfil

export function definirPerfil(e: Estado, perfil: Perfil | null): ResultadoAcao<null> {
  return sucesso({ ...e, perfil }, null);
}

// ---------------------------------------------------------------- comandas

export function abrirComanda(
  e: Estado,
  p: { rotulo?: string; clienteId?: string },
): ResultadoAcao<string> {
  if (!e.perfil) return falha("Escolha um perfil para continuar");
  if (p.clienteId) {
    const cliente = e.clientes.find((c) => c.id === p.clienteId);
    if (!cliente || !cliente.ativo) return falha("Cliente inexistente ou inativo");
  }
  const rotulo = p.rotulo?.trim() || undefined;
  const comanda: Comanda = {
    id: novoId("cmd"),
    clienteId: p.clienteId || undefined,
    rotulo,
    abertaPor: nomeUsuario(e),
    abertaEm: agora(),
  };
  return sucesso({ ...e, comandas: [...e.comandas, comanda] }, comanda.id);
}

export function lancarItem(
  e: Estado,
  p: { comandaId: string; produtoId: string; quantidade: number; destino: Destino },
): ResultadoAcao<string> {
  if (!e.perfil) return falha("Escolha um perfil para continuar");
  const comanda = e.comandas.find((c) => c.id === p.comandaId);
  const visivel =
    !!comanda &&
    !comanda.encerradaEm &&
    (e.perfil === "administrador" ||
      comandaVisivelParaGarcom(e, comanda, nomeUsuario(e)));
  if (!comanda || !visivel) {
    return falha("Comanda inexistente, encerrada ou aberta por outro garçom");
  }
  const produto = e.produtos.find((x) => x.id === p.produtoId);
  if (!produto || !produto.ativo) return falha("Produto inexistente ou inativo");
  if (produto.precoCentavos <= 0) return falha("Produto sem preço cadastrado");
  if (!Number.isInteger(p.quantidade) || p.quantidade <= 0) {
    return falha("Informe uma quantidade válida");
  }

  let clienteId: string | undefined;
  if (p.destino === "conta") {
    if (!e.configuracoes.fiadoAtivo) {
      return falha("Este estabelecimento não trabalha com fiado");
    }
    if (!comanda.clienteId) {
      return falha("Informe o cliente da comanda para lançar na conta");
    }
    const cliente = e.clientes.find((c) => c.id === comanda.clienteId);
    if (!cliente || !cliente.ativo) return falha("Cliente inexistente ou inativo");
    clienteId = cliente.id;
  }

  const item: ItemComanda = {
    id: novoId("it"),
    comandaId: comanda.id,
    tipo: "item",
    produtoId: produto.id,
    quantidade: p.quantidade,
    precoUnitarioCentavos: produto.precoCentavos,
    valorCentavos: p.quantidade * produto.precoCentavos,
    destino: p.destino,
    clienteId,
    registradoPor: nomeUsuario(e),
    registradoEm: agora(),
  };
  return sucesso({ ...e, itens: [...e.itens, item] }, item.id);
}

export function cancelarItem(
  e: Estado,
  p: { itemId: string; motivo: string },
): ResultadoAcao<string> {
  const negado = somenteAdministrador(e);
  if (negado) return falha("Somente o administrador cancela itens");
  const original = e.itens.find((i) => i.id === p.itemId);
  if (!original || original.tipo !== "item") {
    return falha("Item original não encontrado");
  }
  if (e.itens.some((i) => i.tipo === "cancelamento" && i.estornoDe === original.id)) {
    return falha("Este item já foi cancelado");
  }
  if (!p.motivo.trim()) return falha("Informe o motivo do cancelamento");
  const cancelamento: ItemComanda = {
    ...original,
    id: novoId("it"),
    tipo: "cancelamento",
    quantidade: -original.quantidade,
    valorCentavos: -original.valorCentavos,
    estornoDe: original.id,
    motivo: p.motivo.trim(),
    registradoPor: nomeUsuario(e),
    registradoEm: agora(),
  };
  return sucesso({ ...e, itens: [...e.itens, cancelamento] }, cancelamento.id);
}

export function encerrarComanda(e: Estado, comandaId: string): ResultadoAcao<null> {
  const negado = somenteAdministrador(e);
  if (negado) return falha("Somente o administrador encerra comandas");
  const comanda = e.comandas.find((c) => c.id === comandaId);
  if (!comanda || comanda.encerradaEm) {
    return falha("Só é permitido encerrar a comanda, uma única vez");
  }
  if (aReceberComanda(e, comandaId) !== 0) {
    return falha(
      "A comanda tem valor a receber ou a devolver; acerte antes de encerrar",
    );
  }
  const atualizada: Comanda = {
    ...comanda,
    encerradaEm: agora(),
    encerradaPor: nomeUsuario(e),
  };
  return sucesso(
    { ...e, comandas: e.comandas.map((c) => (c.id === comandaId ? atualizada : c)) },
    null,
  );
}

// ------------------------------------------------------------ recebimentos

export function receberComanda(
  e: Estado,
  p: { comandaId: string; forma: FormaPagamento; valorCentavos: number },
): ResultadoAcao<string> {
  const negado = somenteAdministrador(e);
  if (negado) return falha("Somente o administrador registra recebimentos");
  const turno = turnoAberto(e);
  if (!turno) return falha("Não há turno de caixa aberto");
  const comanda = e.comandas.find((c) => c.id === p.comandaId);
  if (!comanda) return falha("Comanda inexistente");
  if (!Number.isInteger(p.valorCentavos) || p.valorCentavos <= 0) {
    return falha("Informe um valor válido");
  }
  if (recebidoComanda(e, comanda.id) + p.valorCentavos > totalAvista(e, comanda.id)) {
    return falha("Valor maior que o saldo a receber da comanda");
  }
  const rec: Recebimento = {
    id: novoId("rec"),
    turnoId: turno.id,
    tipo: "recebimento",
    origem: "comanda",
    comandaId: comanda.id,
    forma: p.forma,
    valorCentavos: p.valorCentavos,
    registradoPor: nomeUsuario(e),
    registradoEm: agora(),
  };
  return sucesso({ ...e, recebimentos: [...e.recebimentos, rec] }, rec.id);
}

/** Pagamento de dívida: permitido mesmo com o fiado desligado. */
export function receberConta(
  e: Estado,
  p: { clienteId: string; forma: FormaPagamento; valorCentavos: number },
): ResultadoAcao<string> {
  const negado = somenteAdministrador(e);
  if (negado) return falha("Somente o administrador registra recebimentos");
  const turno = turnoAberto(e);
  if (!turno) return falha("Não há turno de caixa aberto");
  const cliente = e.clientes.find((c) => c.id === p.clienteId);
  if (!cliente) return falha("Cliente inexistente");
  if (!Number.isInteger(p.valorCentavos) || p.valorCentavos <= 0) {
    return falha("Informe um valor válido");
  }
  if (
    !e.configuracoes.permitePagamentoAMaior &&
    p.valorCentavos > saldoCliente(e, cliente.id)
  ) {
    return falha("Pagamento maior que o saldo devido");
  }
  const rec: Recebimento = {
    id: novoId("rec"),
    turnoId: turno.id,
    tipo: "recebimento",
    origem: "conta",
    clienteId: cliente.id,
    forma: p.forma,
    valorCentavos: p.valorCentavos,
    registradoPor: nomeUsuario(e),
    registradoEm: agora(),
  };
  return sucesso({ ...e, recebimentos: [...e.recebimentos, rec] }, rec.id);
}

/** O estorno entra no turno aberto agora, nunca num turno já fechado. */
export function estornarRecebimento(
  e: Estado,
  p: { recebimentoId: string; motivo: string },
): ResultadoAcao<string> {
  const negado = somenteAdministrador(e);
  if (negado) return falha("Somente o administrador registra recebimentos");
  const turno = turnoAberto(e);
  if (!turno) return falha("Não há turno de caixa aberto");
  const original = e.recebimentos.find((r) => r.id === p.recebimentoId);
  if (!original || original.tipo !== "recebimento") {
    return falha("Recebimento original não encontrado");
  }
  if (e.recebimentos.some((r) => r.tipo === "estorno" && r.estornoDe === original.id)) {
    return falha("Este recebimento já foi estornado");
  }
  if (!p.motivo.trim()) return falha("Informe o motivo do estorno");
  const estorno: Recebimento = {
    ...original,
    id: novoId("rec"),
    turnoId: turno.id,
    tipo: "estorno",
    valorCentavos: -original.valorCentavos,
    estornoDe: original.id,
    motivo: p.motivo.trim(),
    registradoPor: nomeUsuario(e),
    registradoEm: agora(),
  };
  return sucesso({ ...e, recebimentos: [...e.recebimentos, estorno] }, estorno.id);
}

// -------------------------------------------------------------------- caixa

export function abrirTurno(e: Estado, fundoCentavos: number): ResultadoAcao<string> {
  const negado = somenteAdministrador(e);
  if (negado) return falha("Somente o administrador abre e fecha o caixa");
  if (turnoAberto(e)) return falha("Já existe um turno de caixa aberto");
  if (!Number.isInteger(fundoCentavos) || fundoCentavos < 0) {
    return falha("Informe um fundo inicial válido");
  }
  const turno = {
    id: novoId("trn"),
    fundoInicialCentavos: fundoCentavos,
    abertoPor: nomeUsuario(e),
    abertoEm: agora(),
  };
  return sucesso({ ...e, turnos: [...e.turnos, turno] }, turno.id);
}

export function registrarMovimento(
  e: Estado,
  p: { tipo: "suprimento" | "sangria"; valorCentavos: number; motivo: string },
): ResultadoAcao<string> {
  const negado = somenteAdministrador(e);
  if (negado) return falha("Somente o administrador registra sangria e suprimento");
  const turno = turnoAberto(e);
  if (!turno) return falha("Não há turno de caixa aberto");
  if (!Number.isInteger(p.valorCentavos) || p.valorCentavos <= 0) {
    return falha("Informe um valor válido");
  }
  if (!p.motivo.trim()) return falha("Informe o motivo");
  const mov: MovimentoCaixa = {
    id: novoId("mov"),
    turnoId: turno.id,
    tipo: p.tipo,
    valorCentavos: p.valorCentavos,
    motivo: p.motivo.trim(),
    registradoPor: nomeUsuario(e),
    registradoEm: agora(),
  };
  return sucesso({ ...e, movimentos: [...e.movimentos, mov] }, mov.id);
}

/** Fechar o turno: o esperado e a diferença são calculados, nunca digitados. */
export function fecharTurno(
  e: Estado,
  contagem: Record<FormaPagamento, number>,
): ResultadoAcao<string> {
  const negado = somenteAdministrador(e);
  if (negado) return falha("Somente o administrador abre e fecha o caixa");
  const turno = turnoAberto(e);
  if (!turno) return falha("Não há turno de caixa aberto");
  for (const forma of FORMAS) {
    const v = contagem[forma];
    if (!Number.isInteger(v) || v < 0) {
      return falha(`Valor contado inválido para ${ROTULO_FORMA[forma]}`);
    }
  }
  const fechamento: FechamentoForma[] = resumoTurno(e, turno.id).map((linha) => ({
    forma: linha.forma,
    esperadoCentavos: linha.esperadoCentavos,
    contadoCentavos: contagem[linha.forma],
    diferencaCentavos: contagem[linha.forma] - linha.esperadoCentavos,
  }));
  const fechado = {
    ...turno,
    fechadoEm: agora(),
    fechadoPor: nomeUsuario(e),
    fechamento,
  };
  return sucesso(
    { ...e, turnos: e.turnos.map((t) => (t.id === turno.id ? fechado : t)) },
    turno.id,
  );
}

// ------------------------------------------------------------ venda rápida

/**
 * Venda paga na hora: abre a comanda, lança os itens à vista, recebe nas
 * formas informadas e encerra, tudo de uma vez.
 */
export function vendaRapida(
  e: Estado,
  p: {
    rotulo?: string;
    itens: Array<{ produtoId: string; quantidade: number }>;
    pagamentos: Array<{ forma: FormaPagamento; valorCentavos: number }>;
  },
): ResultadoAcao<string> {
  const negado = somenteAdministrador(e);
  if (negado) return falha("Somente o administrador registra recebimentos");
  if (!turnoAberto(e)) return falha("Não há turno de caixa aberto");
  if (p.itens.length === 0) return falha("Adicione ao menos um produto");

  let atual = e;
  const aberta = abrirComanda(atual, { rotulo: p.rotulo || "Venda rápida" });
  if (!aberta.ok) return aberta;
  atual = aberta.estado;
  const comandaId = aberta.valor;

  for (const item of p.itens) {
    const r = lancarItem(atual, {
      comandaId,
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      destino: "avista",
    });
    if (!r.ok) return r;
    atual = r.estado;
  }

  const total = totalAvista(atual, comandaId);
  const pago = p.pagamentos.reduce((s, x) => s + x.valorCentavos, 0);
  if (pago !== total) {
    return falha("A soma dos pagamentos deve ser igual ao total da venda");
  }
  for (const pagamento of p.pagamentos) {
    const r = receberComanda(atual, {
      comandaId,
      forma: pagamento.forma,
      valorCentavos: pagamento.valorCentavos,
    });
    if (!r.ok) return r;
    atual = r.estado;
  }

  const encerrada = encerrarComanda(atual, comandaId);
  if (!encerrada.ok) return encerrada;
  return sucesso(encerrada.estado, comandaId);
}

// ------------------------------------------------ cadastros e configurações

export function salvarProduto(
  e: Estado,
  p: { id?: string; nome: string; precoCentavos: number },
): ResultadoAcao<string> {
  const negado = somenteAdministrador(e);
  if (negado) return falha("Somente o administrador cadastra produtos");
  if (!p.nome.trim()) return falha("Informe o nome do produto");
  if (!Number.isInteger(p.precoCentavos) || p.precoCentavos <= 0) {
    return falha("Informe um preço maior que zero");
  }
  if (p.id) {
    const existe = e.produtos.some((x) => x.id === p.id);
    if (!existe) return falha("Produto inexistente");
    return sucesso(
      {
        ...e,
        produtos: e.produtos.map((x) =>
          x.id === p.id
            ? { ...x, nome: p.nome.trim(), precoCentavos: p.precoCentavos }
            : x,
        ),
      },
      p.id,
    );
  }
  const novo: Produto = {
    id: novoId("prod"),
    nome: p.nome.trim(),
    precoCentavos: p.precoCentavos,
    ativo: true,
  };
  return sucesso({ ...e, produtos: [...e.produtos, novo] }, novo.id);
}

export function alternarProduto(e: Estado, produtoId: string): ResultadoAcao<null> {
  const negado = somenteAdministrador(e);
  if (negado) return falha("Somente o administrador cadastra produtos");
  if (!e.produtos.some((x) => x.id === produtoId)) return falha("Produto inexistente");
  return sucesso(
    {
      ...e,
      produtos: e.produtos.map((x) =>
        x.id === produtoId ? { ...x, ativo: !x.ativo } : x,
      ),
    },
    null,
  );
}

/** Garçom só cadastra cliente novo se o bar ativou essa configuração. */
export function salvarCliente(
  e: Estado,
  p: { id?: string; nome: string; apelido?: string; telefone?: string },
): ResultadoAcao<string> {
  const ehAdmin = e.perfil === "administrador";
  const garcomPode =
    e.perfil === "garcom" && e.configuracoes.garcomCadastraClientes && !p.id;
  if (!ehAdmin && !garcomPode) {
    return falha("Você não tem permissão para cadastrar ou alterar clientes");
  }
  if (!p.nome.trim()) return falha("Informe o nome do cliente");
  const apelido = p.apelido?.trim() || undefined;
  const telefone = p.telefone?.trim() || undefined;
  if (p.id) {
    if (!e.clientes.some((c) => c.id === p.id)) return falha("Cliente inexistente");
    return sucesso(
      {
        ...e,
        clientes: e.clientes.map((c) =>
          c.id === p.id ? { ...c, nome: p.nome.trim(), apelido, telefone } : c,
        ),
      },
      p.id,
    );
  }
  const novo: Cliente = {
    id: novoId("cli"),
    nome: p.nome.trim(),
    apelido,
    telefone,
    ativo: true,
  };
  return sucesso({ ...e, clientes: [...e.clientes, novo] }, novo.id);
}

export function alterarConfiguracoes(
  e: Estado,
  parcial: Partial<Configuracoes>,
): ResultadoAcao<null> {
  const negado = somenteAdministrador(e);
  if (negado) return falha("Somente o administrador altera as configurações");
  return sucesso(
    { ...e, configuracoes: { ...e.configuracoes, ...parcial } },
    null,
  );
}
