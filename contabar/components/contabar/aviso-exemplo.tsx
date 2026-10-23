import { TriangleAlert } from "lucide-react";

/** Aviso fixo: enquanto o banco não for migrado, tudo é exemplo. */
export function AvisoExemplo() {
  return (
    <div
      role="note"
      className="flex flex-wrap items-start gap-x-2 gap-y-1 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200"
    >
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1">
        <strong>DEMONSTRAÇÃO com dados de exemplo.</strong> Tudo o que aparece aqui é
        fictício e fica salvo só neste navegador. Nada é enviado a nenhum servidor.
      </p>
      <p className="flex gap-3">
        {/* Links simples (não <Link>) para não pré-carregar a rota que apaga o cookie. */}
        <a href="/demo/sair" className="underline underline-offset-4">
          Sair da demonstração
        </a>
        <a href="/privacidade" className="underline underline-offset-4">
          Privacidade
        </a>
      </p>
    </div>
  );
}
