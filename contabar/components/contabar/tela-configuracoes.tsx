"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { alterarConfiguracoes } from "@/lib/contabar/acoes";
import { useLoja } from "@/lib/contabar/loja";
import { existemDividas } from "@/lib/contabar/regras";
import type { Configuracoes } from "@/lib/contabar/tipos";
import { Mensagem, Pagina } from "./ui";

const OPCOES: Array<{
  chave: keyof Configuracoes;
  titulo: string;
  descricao: string;
}> = [
  {
    chave: "garcomVeTelefone",
    titulo: "Garçom vê o telefone dos clientes",
    descricao: "Desligado por padrão, para proteger os dados dos clientes.",
  },
  {
    chave: "garcomVeTodasComandasAbertas",
    titulo: "Garçom vê todas as comandas abertas",
    descricao:
      "Desligado: cada garçom vê só as comandas que abriu. Ligado: todos veem as abertas (útil quando mesas passam de um garçom para outro).",
  },
  {
    chave: "garcomCadastraClientes",
    titulo: "Garçom pode cadastrar clientes novos",
    descricao:
      "Desligado: só o administrador cadastra. Como o cliente cadastrado pode receber fiado, pense bem antes de ligar.",
  },
  {
    chave: "permitePagamentoAMaior",
    titulo: "Permitir pagamento de conta maior que a dívida",
    descricao:
      "Ligado: o excedente vira crédito do cliente. Desligado: o sistema recusa pagamento acima do saldo devedor.",
  },
];

export function TelaConfiguracoes() {
  const { estado, executar, restaurarExemplo } = useLoja();
  const c = estado.configuracoes;

  function alterar(parcial: Partial<Configuracoes>) {
    executar((e) => alterarConfiguracoes(e, parcial));
  }

  return (
    <Pagina
      titulo="Configurações"
      descricao="Regras que variam de bar para bar. Cada estabelecimento define as suas."
    >
      <Card className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">Fiado (conta do cliente)</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ligado: o bar pode lançar consumo na conta contínua do cliente. Desligado:
              novas vendas não podem virar fiado; dívidas antigas continuam visíveis e
              podem ser pagas.
            </p>
          </div>
          <label className="flex shrink-0 items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={c.fiadoAtivo}
              onChange={(e) => alterar({ fiadoAtivo: e.target.checked })}
            />
            {c.fiadoAtivo ? "Ligado" : "Desligado"}
          </label>
        </div>
        {!c.fiadoAtivo && existemDividas(estado) && (
          <Mensagem tipo="aviso">
            Ainda existem dívidas antigas. Elas continuam visíveis na tela de fiado e
            podem ser pagas.
          </Mensagem>
        )}
      </Card>

      {OPCOES.map((o) => (
        <Card key={o.chave} className="flex items-start justify-between gap-4 p-5">
          <div>
            <h2 className="font-semibold">{o.titulo}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{o.descricao}</p>
          </div>
          <label className="flex shrink-0 items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={c[o.chave]}
              onChange={(e) => alterar({ [o.chave]: e.target.checked })}
            />
            {c[o.chave] ? "Ligado" : "Desligado"}
          </label>
        </Card>
      ))}

      <Card className="space-y-3 p-5">
        <h2 className="font-semibold">Dados de exemplo</h2>
        <p className="text-sm text-muted-foreground">
          Tudo o que você vê hoje é fictício e fica salvo só neste navegador. Restaurar
          apaga o que você mexeu e volta ao exemplo original.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            if (window.confirm("Restaurar os dados de exemplo? Isso apaga o que você mexeu.")) {
              restaurarExemplo();
            }
          }}
        >
          Restaurar dados de exemplo
        </Button>
      </Card>
    </Pagina>
  );
}
