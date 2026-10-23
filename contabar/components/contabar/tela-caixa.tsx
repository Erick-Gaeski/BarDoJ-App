"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  abrirTurno,
  estornarRecebimento,
  fecharTurno,
  registrarMovimento,
} from "@/lib/contabar/acoes";
import {
  centavosParaTexto,
  formatarBRL,
  formatarDataHora,
  formatarHora,
  paraCentavos,
} from "@/lib/contabar/dinheiro";
import { useLoja } from "@/lib/contabar/loja";
import {
  nomeCliente,
  recebimentoEstornado,
  recebimentosDoTurno,
  resumoTurno,
  rotuloComanda,
  turnoAberto,
} from "@/lib/contabar/regras";
import type { FechamentoForma, FormaPagamento, TurnoCaixa } from "@/lib/contabar/tipos";
import { FORMAS, ROTULO_FORMA } from "@/lib/contabar/tipos";
import { Campo, Etiqueta, Mensagem, Modal, Pagina, Selecao, Vazio } from "./ui";

function ClasseDiferenca(diferenca: number) {
  if (diferenca === 0) return "text-muted-foreground";
  return diferenca < 0
    ? "text-red-600 dark:text-red-400 font-bold"
    : "text-emerald-600 dark:text-emerald-400 font-bold";
}

function TabelaFechamento({ linhas }: { linhas: FechamentoForma[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Forma</th>
            <th className="py-2 pr-3 text-right font-medium">Esperado</th>
            <th className="py-2 pr-3 text-right font-medium">Contado</th>
            <th className="py-2 text-right font-medium">Diferença</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.forma} className="border-b last:border-0">
              <td className="py-2 pr-3">{ROTULO_FORMA[l.forma]}</td>
              <td className="py-2 pr-3 text-right">{formatarBRL(l.esperadoCentavos)}</td>
              <td className="py-2 pr-3 text-right">{formatarBRL(l.contadoCentavos)}</td>
              <td className={`py-2 text-right font-semibold ${ClasseDiferenca(l.diferencaCentavos)}`}>
                {formatarBRL(l.diferencaCentavos)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TelaCaixa() {
  const { estado, executar } = useLoja();
  const turno = turnoAberto(estado);

  const [fundo, setFundo] = useState("0,00");
  const [erro, setErro] = useState<string | null>(null);

  const [movimentoAberto, setMovimentoAberto] = useState(false);
  const [tipoMov, setTipoMov] = useState<"suprimento" | "sangria">("sangria");
  const [valorMov, setValorMov] = useState("");
  const [motivoMov, setMotivoMov] = useState("");

  const [fechando, setFechando] = useState(false);
  const [contagem, setContagem] = useState<Record<FormaPagamento, string>>({
    dinheiro: "",
    pix: "",
    cartao: "",
    outro: "",
  });
  const [erroModal, setErroModal] = useState<string | null>(null);
  const [ultimoFechado, setUltimoFechado] = useState<string | null>(null);

  const [estornando, setEstornando] = useState<string | null>(null);
  const [motivoEstorno, setMotivoEstorno] = useState("");

  const resumo = turno ? resumoTurno(estado, turno.id) : [];
  const movimentos = turno
    ? estado.movimentos
        .filter((m) => m.turnoId === turno.id)
        .sort((a, b) => b.registradoEm.localeCompare(a.registradoEm))
    : [];
  const recebimentos = turno ? recebimentosDoTurno(estado, turno.id) : [];
  const historico = estado.turnos
    .filter((t) => t.fechadoEm)
    .sort((a, b) => (b.fechadoEm ?? "").localeCompare(a.fechadoEm ?? ""));
  const turnoRecemFechado: TurnoCaixa | undefined = ultimoFechado
    ? estado.turnos.find((t) => t.id === ultimoFechado)
    : undefined;

  function abrir() {
    setErro(null);
    const centavos = paraCentavos(fundo);
    if (centavos === null) {
      setErro("Informe um fundo inicial válido");
      return;
    }
    const r = executar((e) => abrirTurno(e, centavos));
    if (!r.ok) setErro(r.erro);
    else setUltimoFechado(null);
  }

  function confirmarMovimento() {
    setErroModal(null);
    const centavos = paraCentavos(valorMov);
    if (centavos === null || centavos <= 0) {
      setErroModal("Informe um valor válido");
      return;
    }
    const r = executar((e) =>
      registrarMovimento(e, { tipo: tipoMov, valorCentavos: centavos, motivo: motivoMov }),
    );
    if (!r.ok) {
      setErroModal(r.erro);
      return;
    }
    setMovimentoAberto(false);
    setValorMov("");
    setMotivoMov("");
  }

  function confirmarFechamento() {
    setErroModal(null);
    const valores = {} as Record<FormaPagamento, number>;
    for (const f of FORMAS) {
      const v = contagem[f].trim() === "" ? 0 : paraCentavos(contagem[f]);
      if (v === null) {
        setErroModal(`Valor contado inválido para ${ROTULO_FORMA[f]}`);
        return;
      }
      valores[f] = v;
    }
    const r = executar((e) => fecharTurno(e, valores));
    if (!r.ok) {
      setErroModal(r.erro);
      return;
    }
    setFechando(false);
    setUltimoFechado(r.valor);
    setContagem({ dinheiro: "", pix: "", cartao: "", outro: "" });
  }

  function confirmarEstorno() {
    if (!estornando) return;
    setErroModal(null);
    const r = executar((e) =>
      estornarRecebimento(e, { recebimentoId: estornando, motivo: motivoEstorno }),
    );
    if (!r.ok) {
      setErroModal(r.erro);
      return;
    }
    setEstornando(null);
    setMotivoEstorno("");
  }

  return (
    <Pagina
      titulo="Caixa"
      descricao="Abra e feche o caixa por turno, conferindo o valor esperado em cada forma de pagamento."
    >
      {turnoRecemFechado?.fechamento && (
        <Card className="space-y-3 border-emerald-300 p-4 dark:border-emerald-800">
          <h2 className="font-semibold">Turno fechado: esperado, contado e diferença</h2>
          <TabelaFechamento linhas={turnoRecemFechado.fechamento} />
        </Card>
      )}

      {!turno ? (
        <Card className="max-w-md space-y-4 p-5">
          <h2 className="font-semibold">Abrir o caixa</h2>
          <p className="text-sm text-muted-foreground">
            Informe o dinheiro que está na gaveta para começar o turno (troco inicial).
          </p>
          <Campo rotulo="Fundo inicial (dinheiro)">
            <Input inputMode="decimal" value={fundo} onChange={(e) => setFundo(e.target.value)} />
          </Campo>
          {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
          <Button onClick={abrir}>Abrir turno</Button>
        </Card>
      ) : (
        <>
          <Card className="space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">Turno aberto</h2>
                  <Etiqueta tom="ok">Aberto</Etiqueta>
                </div>
                <p className="text-xs text-muted-foreground">
                  Desde {formatarDataHora(turno.abertoEm)} por {turno.abertoPor} · fundo inicial{" "}
                  {formatarBRL(turno.fundoInicialCentavos)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setErroModal(null);
                    setMovimentoAberto(true);
                  }}
                >
                  Sangria / suprimento
                </Button>
                <Button
                  onClick={() => {
                    setErroModal(null);
                    setFechando(true);
                  }}
                >
                  Fechar caixa
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Forma</th>
                    <th className="py-2 pr-3 text-right font-medium">Fundo</th>
                    <th className="py-2 pr-3 text-right font-medium">Vendas</th>
                    <th className="py-2 pr-3 text-right font-medium">Contas de clientes</th>
                    <th className="py-2 pr-3 text-right font-medium">Sangria/suprimento</th>
                    <th className="py-2 text-right font-medium">Esperado</th>
                  </tr>
                </thead>
                <tbody>
                  {resumo.map((l) => (
                    <tr key={l.forma} className="border-b last:border-0">
                      <td className="py-2 pr-3">{ROTULO_FORMA[l.forma]}</td>
                      <td className="py-2 pr-3 text-right">{formatarBRL(l.fundoCentavos)}</td>
                      <td className="py-2 pr-3 text-right">{formatarBRL(l.vendasCentavos)}</td>
                      <td className="py-2 pr-3 text-right">{formatarBRL(l.contasCentavos)}</td>
                      <td className="py-2 pr-3 text-right">{formatarBRL(l.ajustesCentavos)}</td>
                      <td className="py-2 text-right font-semibold">{formatarBRL(l.esperadoCentavos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Consumo lançado na conta (fiado) não entra aqui. Só o pagamento real de um
              cliente entra, na linha “Contas de clientes”.
            </p>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="space-y-2 p-4">
              <h2 className="font-semibold">Recebimentos do turno</h2>
              {recebimentos.length === 0 ? (
                <Vazio>Nenhum recebimento neste turno.</Vazio>
              ) : (
                <ul className="divide-y">
                  {recebimentos.map((r) => {
                    const cliente = r.clienteId ? estado.clientes.find((c) => c.id === r.clienteId) : undefined;
                    const comanda = r.comandaId ? estado.comandas.find((c) => c.id === r.comandaId) : undefined;
                    return (
                      <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <div>
                          <p className="font-medium">
                            {r.tipo === "estorno" ? "Estorno · " : ""}
                            {ROTULO_FORMA[r.forma]} ·{" "}
                            {r.origem === "conta"
                              ? `Conta de ${cliente ? nomeCliente(cliente) : "cliente"}`
                              : comanda
                                ? rotuloComanda(estado, comanda)
                                : "Comanda"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatarHora(r.registradoEm)} · {r.registradoPor}
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
                                onClick={() => {
                                  setErroModal(null);
                                  setMotivoEstorno("");
                                  setEstornando(r.id);
                                }}
                              >
                                Estornar
                              </Button>
                            ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card className="space-y-2 p-4">
              <h2 className="font-semibold">Sangrias e suprimentos</h2>
              {movimentos.length === 0 ? (
                <Vazio>Nenhum movimento neste turno.</Vazio>
              ) : (
                <ul className="divide-y">
                  {movimentos.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">
                          {m.tipo === "sangria" ? "Sangria" : "Suprimento"} · {m.motivo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatarHora(m.registradoEm)} · {m.registradoPor}
                        </p>
                      </div>
                      <span className="font-semibold">
                        {m.tipo === "sangria" ? "−" : "+"}
                        {formatarBRL(m.valorCentavos)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}

      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">Turnos anteriores</h2>
        {historico.length === 0 ? (
          <Vazio>Nenhum turno fechado ainda.</Vazio>
        ) : (
          <div className="space-y-2">
            {historico.map((t) => (
              <details key={t.id} className="rounded-md border p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  {formatarDataHora(t.abertoEm)} até {t.fechadoEm ? formatarDataHora(t.fechadoEm) : ""}
                  {t.fechamento && t.fechamento.some((f) => f.diferencaCentavos !== 0) && (
                    <span className="ml-2">
                      <Etiqueta tom="alerta">Com diferença</Etiqueta>
                    </span>
                  )}
                </summary>
                <div className="mt-3">
                  {t.fechamento ? <TabelaFechamento linhas={t.fechamento} /> : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Aberto por {t.abertoPor}, fechado por {t.fechadoPor}. Fundo inicial{" "}
                    {formatarBRL(t.fundoInicialCentavos)}.
                  </p>
                </div>
              </details>
            ))}
          </div>
        )}
      </Card>

      <Modal aberto={movimentoAberto} aoFechar={() => setMovimentoAberto(false)} titulo="Sangria ou suprimento">
        <div className="space-y-4">
          <Campo rotulo="Tipo">
            <Selecao value={tipoMov} onChange={(e) => setTipoMov(e.target.value as "suprimento" | "sangria")}>
              <option value="sangria">Sangria (retirada de dinheiro)</option>
              <option value="suprimento">Suprimento (reforço de troco)</option>
            </Selecao>
          </Campo>
          <Campo rotulo="Valor">
            <Input inputMode="decimal" value={valorMov} onChange={(e) => setValorMov(e.target.value)} placeholder="0,00" />
          </Campo>
          <Campo rotulo="Motivo">
            <Input value={motivoMov} onChange={(e) => setMotivoMov(e.target.value)} placeholder="Ex.: troco para o fim de semana" />
          </Campo>
          {erroModal && <Mensagem tipo="erro">{erroModal}</Mensagem>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setMovimentoAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarMovimento}>Registrar</Button>
          </div>
        </div>
      </Modal>

      <Modal aberto={fechando} aoFechar={() => setFechando(false)} titulo="Fechar o caixa">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Informe quanto foi contado em cada forma. A diferença é calculada na hora (contado menos esperado).
          </p>
          <div className="space-y-3">
            {resumo.map((l) => {
              const digitado = contagem[l.forma].trim() === "" ? null : paraCentavos(contagem[l.forma]);
              const diferenca = digitado === null ? null : digitado - l.esperadoCentavos;
              return (
                <div key={l.forma} className="grid grid-cols-[1fr_9rem] items-end gap-3">
                  <Campo
                    rotulo={`${ROTULO_FORMA[l.forma]} (esperado ${formatarBRL(l.esperadoCentavos)})`}
                    dica={
                      diferenca === null
                        ? undefined
                        : `Diferença: ${formatarBRL(diferenca)}`
                    }
                  >
                    <Input
                      inputMode="decimal"
                      value={contagem[l.forma]}
                      onChange={(e) => setContagem((c) => ({ ...c, [l.forma]: e.target.value }))}
                      placeholder={centavosParaTexto(0)}
                    />
                  </Campo>
                  <span
                    className={`pb-2 text-right text-sm font-semibold ${diferenca === null ? "" : ClasseDiferenca(diferenca)}`}
                  >
                    {diferenca === null ? "—" : formatarBRL(diferenca)}
                  </span>
                </div>
              );
            })}
          </div>
          {erroModal && <Mensagem tipo="erro">{erroModal}</Mensagem>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFechando(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarFechamento}>Fechar caixa</Button>
          </div>
        </div>
      </Modal>

      <Modal aberto={!!estornando} aoFechar={() => setEstornando(null)} titulo="Estornar recebimento">
        <div className="space-y-4">
          <Campo rotulo="Motivo">
            <Input value={motivoEstorno} onChange={(e) => setMotivoEstorno(e.target.value)} placeholder="Ex.: forma de pagamento errada" />
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
