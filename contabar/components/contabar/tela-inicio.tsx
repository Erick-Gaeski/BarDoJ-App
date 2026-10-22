"use client";

import { useRouter } from "next/navigation";
import { Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { definirPerfil } from "@/lib/contabar/acoes";
import { useLoja } from "@/lib/contabar/loja";
import type { Perfil } from "@/lib/contabar/tipos";
import { AvisoExemplo } from "./aviso-exemplo";
import { Logo } from "./logo";
import { Mensagem } from "./ui";

/**
 * Escolha de perfil (MODO DE DEMONSTRAÇÃO).
 * Quando o banco estiver migrado, o perfil virá do vínculo do usuário com o bar
 * (administrador ou garçom) e esta tela deixará de existir.
 */
export function TelaInicio() {
  const { estado, executar, restaurarExemplo } = useLoja();
  const router = useRouter();

  function entrar(perfil: Perfil) {
    executar((e) => definirPerfil(e, perfil));
    router.push(perfil === "administrador" ? "/painel" : "/garcom");
  }

  return (
    <div className="min-h-screen">
      <AvisoExemplo />
      <div className="mx-auto max-w-3xl space-y-6 p-4 py-10 md:p-8">
        <div className="space-y-2">
          <Logo className="[&_svg]:h-11 [&_svg]:w-11 [&_span]:text-3xl" />
          <p className="text-muted-foreground">{estado.estabelecimentoNome}</p>
        </div>

        <Mensagem tipo="aviso">
          <strong>Você está na demonstração.</strong> Escolha o perfil que quer ver.
          Depois da conexão com o banco, cada pessoa entrará direto na tela do seu
          perfil.
        </Mensagem>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="flex flex-col gap-4 p-6">
            <Monitor className="h-8 w-8 text-primary" />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Administrador</h2>
              <p className="text-sm text-muted-foreground">
                Pensado para o computador: painel, vendas, comandas, caixa, fiado,
                produtos e configurações.
              </p>
            </div>
            <Button onClick={() => entrar("administrador")} className="mt-auto">
              {estado.perfil === "administrador"
                ? "Continuar como administrador"
                : "Entrar como administrador"}
            </Button>
          </Card>

          <Card className="flex flex-col gap-4 p-6">
            <Smartphone className="h-8 w-8 text-primary" />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Garçom</h2>
              <p className="text-sm text-muted-foreground">
                Pensado para o celular: abrir comandas e lançar itens, sem ver caixa
                nem saldos.
              </p>
            </div>
            <Button onClick={() => entrar("garcom")} className="mt-auto">
              {estado.perfil === "garcom" ? "Continuar como garçom" : "Entrar como garçom"}
            </Button>
          </Card>
        </div>

        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          <p>
            Dica: abra o garçom numa aba e o administrador em outra. Os dados de
            exemplo são sincronizados entre as abas do mesmo navegador, e você vê o
            painel atualizar quando o garçom lança um item.
          </p>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "Restaurar os dados de exemplo? Isso apaga o que você mexeu.",
                )
              ) {
                restaurarExemplo();
              }
            }}
            className="mt-3 text-foreground underline underline-offset-4"
          >
            Restaurar dados de exemplo
          </button>
        </div>
      </div>
    </div>
  );
}
