import Link from "next/link";
import { Suspense } from "react";
import { ClipboardList, HandCoins, ShoppingCart, Wallet } from "lucide-react";
import { AuthButton } from "@/components/auth-button";
import { Logo } from "@/components/contabar/logo";
import { EnvVarWarning } from "@/components/env-var-warning";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { hasEnvVars } from "@/lib/utils";

const RECURSOS = [
  {
    icone: ShoppingCart,
    titulo: "Vendas pagas na hora",
    texto: "Registre a venda, receba em dinheiro, Pix ou cartão e pronto.",
  },
  {
    icone: ClipboardList,
    titulo: "Comandas",
    texto: "O garçom lança os itens no celular; o administrador acompanha no computador.",
  },
  {
    icone: Wallet,
    titulo: "Caixa por turno",
    texto: "Abra e feche o caixa vendo o esperado, o contado e a diferença de cada forma de pagamento.",
  },
  {
    icone: HandCoins,
    titulo: "Fiado opcional",
    texto: "Cada bar escolhe se usa. Ligado, o consumo vai para a conta do cliente, separada do caixa.",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center">
      <nav className="flex h-16 w-full justify-center border-b border-b-foreground/10">
        <div className="flex w-full max-w-5xl items-center justify-between p-3 px-5 text-sm">
          <Link href="/" aria-label="ContaBar, página inicial">
            <Logo />
          </Link>
          {!hasEnvVars ? (
            <EnvVarWarning />
          ) : (
            <Suspense>
              <AuthButton />
            </Suspense>
          )}
        </div>
      </nav>

      <div className="flex w-full max-w-5xl flex-1 flex-col gap-12 p-5 py-16">
        <section className="space-y-5 text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Controle do bar, do caixa ao fiado
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Vendas, comandas e caixa por turno para qualquer bar, com o fiado como um
            recurso opcional.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {/* <a> simples: /demo é uma rota que prepara a demonstração e redireciona */}
            <Button asChild size="lg">
              <a href="/demo">Entrar na demonstração</a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/auth/login">Entrar com minha conta</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            A demonstração usa dados fictícios, não pede senha e não envia nada a
            nenhum servidor.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {RECURSOS.map(({ icone: Icone, titulo, texto }) => (
            <div key={titulo} className="rounded-xl border p-5">
              <Icone className="h-6 w-6 text-primary" />
              <h2 className="mt-3 font-semibold">{titulo}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
            </div>
          ))}
        </section>
      </div>

      <footer className="flex w-full flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t py-10 text-xs">
        <p>ContaBar · versão de demonstração</p>
        <Link href="/privacidade" className="underline underline-offset-4">
          Política de privacidade
        </Link>
        <ThemeSwitcher />
      </footer>
    </main>
  );
}
