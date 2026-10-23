"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function Pagina({
  titulo,
  descricao,
  acoes,
  children,
}: {
  titulo: string;
  descricao?: string;
  acoes?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
          {descricao && (
            <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
          )}
        </div>
        {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
      </div>
      {children}
    </div>
  );
}

export function Estatistica({
  titulo,
  valor,
  detalhe,
  tom = "normal",
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
  tom?: "normal" | "alerta" | "ok";
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {titulo}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold",
          tom === "alerta" && "text-black",
          tom === "ok" && "text-emerald-600 dark:text-white",
        )}
      >
        {valor}
      </p>
      {detalhe && <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>}
    </Card>
  );
}

const TONS_ETIQUETA = {
  neutro: "bg-secondary text-secondary-foreground",
  ok: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  alerta: "bg-amber-100 text-black dark:bg-amber-950 dark:text-black",
  perigo: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  info: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
} as const;

export function Etiqueta({
  tom = "neutro",
  children,
}: {
  tom?: keyof typeof TONS_ETIQUETA;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold",
        TONS_ETIQUETA[tom],
      )}
    >
      {children}
    </span>
  );
}

const TONS_MENSAGEM = {
  info: "border-sky-300 bg-sky-50 text-sky-950 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100",
  aviso:
    "border-amber-300 bg-amber-50 text-black dark:border-amber-800 dark:bg-amber-950/40 dark:text-black",
  erro: "border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100",
  ok: "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100",
} as const;

export function Mensagem({
  tipo = "info",
  children,
}: {
  tipo?: keyof typeof TONS_MENSAGEM;
  children: React.ReactNode;
}) {
  return (
    <div
      role={tipo === "erro" ? "alert" : "status"}
      className={cn("rounded-md border px-3 py-2 text-sm", TONS_MENSAGEM[tipo])}
    >
      {children}
    </div>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export function Campo({
  rotulo,
  dica,
  children,
}: {
  rotulo: string;
  dica?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium">{rotulo}</span>
      {children}
      {dica && <span className="text-xs text-muted-foreground">{dica}</span>}
    </label>
  );
}

export const Selecao = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select">
>(function Selecao({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});

export function Modal({
  aberto,
  aoFechar,
  titulo,
  children,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) dialogo.showModal();
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      onClose={aoFechar}
      onClick={(ev) => {
        if (ev.target === ref.current) aoFechar();
      }}
      className="m-auto max-h-[90vh] w-[min(92vw,30rem)] overflow-auto rounded-xl border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-black/50"
    >
      {aberto && (
        <div className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold">{titulo}</h2>
            <button
              type="button"
              onClick={aoFechar}
              aria-label="Fechar"
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

/** Linha de tabela responsiva em cartões: rótulo à esquerda, valor à direita. */
export function Linha({
  rotulo,
  children,
  forte,
}: {
  rotulo: React.ReactNode;
  children: React.ReactNode;
  forte?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className={cn("text-right", forte && "font-semibold")}>{children}</span>
    </div>
  );
}
