"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Perfil } from "@/lib/contabar/tipos";
import { NOME_PERFIL } from "@/lib/contabar/tipos";
import { AvisoExemplo } from "./aviso-exemplo";

/**
 * Mostrado quando o perfil escolhido não corresponde à área aberta.
 * (No modo de exemplo o perfil é escolhido na tela inicial; com o banco
 * migrado, o perfil virá do vínculo do usuário com o bar.)
 */
export function AcessoPerfil({ esperado }: { esperado: Perfil }) {
  return (
    <div className="min-h-screen">
      <AvisoExemplo />
      <div className="mx-auto max-w-md space-y-4 p-8 text-center">
        <h1 className="text-xl font-bold">Perfil diferente</h1>
        <p className="text-sm text-muted-foreground">
          Esta área é para o perfil <strong>{NOME_PERFIL[esperado]}</strong>.
          Escolha o perfil na tela inicial para continuar.
        </p>
        <Button asChild>
          <Link href="/inicio">Escolher perfil</Link>
        </Button>
      </div>
    </div>
  );
}
