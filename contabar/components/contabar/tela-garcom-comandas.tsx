"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatarBRL, formatarHora } from "@/lib/contabar/dinheiro";
import { useLoja } from "@/lib/contabar/loja";
import { nomeUsuario } from "@/lib/contabar/acoes";
import {
  comandaVisivelParaGarcom,
  itensComStatus,
  rotuloComanda,
  totalGeral,
} from "@/lib/contabar/regras";
import { Etiqueta, Pagina, Vazio } from "./ui";

/** Comandas abertas visíveis ao garçom (as dele, ou todas se o bar ativou). */
export function TelaGarcomComandas() {
  const { estado } = useLoja();
  const usuario = nomeUsuario(estado);
  const comandas = estado.comandas
    .filter((c) => comandaVisivelParaGarcom(estado, c, usuario))
    .sort((a, b) => b.abertaEm.localeCompare(a.abertaEm));

  return (
    <Pagina
      titulo="Minhas comandas"
      descricao={
        estado.configuracoes.garcomVeTodasComandasAbertas
          ? "Todas as comandas abertas do bar."
          : "Comandas abertas por você."
      }
    >
      {comandas.length === 0 ? (
        <Vazio>
          Nenhuma comanda aberta.
          <div className="mt-4">
            <Button asChild className="h-12 text-base">
              <Link href="/garcom/nova">
                <Plus className="mr-1 h-5 w-5" />
                Nova comanda
              </Link>
            </Button>
          </div>
        </Vazio>
      ) : (
        <div className="grid gap-3">
          {comandas.map((c) => {
            const qtd = itensComStatus(estado, c.id).filter((i) => !i.cancelado).length;
            return (
              <Link key={c.id} href={`/garcom/comanda/${c.id}`}>
                <Card className="flex items-center justify-between gap-3 p-4 active:bg-accent">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">{rotuloComanda(estado, c)}</p>
                    <p className="text-sm text-muted-foreground">
                      {qtd} {qtd === 1 ? "item" : "itens"} · aberta às {formatarHora(c.abertaEm)}
                    </p>
                    {c.abertaPor !== usuario && <Etiqueta>{c.abertaPor}</Etiqueta>}
                  </div>
                  <span className="text-lg font-bold">{formatarBRL(totalGeral(estado, c.id))}</span>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </Pagina>
  );
}
