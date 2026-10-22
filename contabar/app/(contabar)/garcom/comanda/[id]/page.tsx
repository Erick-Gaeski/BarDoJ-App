import { Suspense } from "react";
import { TelaGarcomComanda } from "@/components/contabar/tela-garcom-comanda";

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
      <TelaGarcomComanda />
    </Suspense>
  );
}
