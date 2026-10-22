import { Suspense } from "react";
import { TelaComandas } from "@/components/contabar/tela-comandas";

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
      <TelaComandas />
    </Suspense>
  );
}
