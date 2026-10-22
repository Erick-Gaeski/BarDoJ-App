import { Suspense } from "react";
import { TelaFiadoCliente } from "@/components/contabar/tela-fiado-cliente";

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
      <TelaFiadoCliente />
    </Suspense>
  );
}
