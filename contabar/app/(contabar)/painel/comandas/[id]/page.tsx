import { Suspense } from "react";
import { TelaComandaDetalhe } from "@/components/contabar/tela-comanda-detalhe";

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
      <TelaComandaDetalhe />
    </Suspense>
  );
}
