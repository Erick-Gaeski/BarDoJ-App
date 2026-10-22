"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useLoja } from "@/lib/contabar/loja";
import { NOME_PERFIL } from "@/lib/contabar/tipos";
import { AcessoPerfil } from "./acesso-perfil";
import { AvisoExemplo } from "./aviso-exemplo";
import { Logo } from "./logo";

/** Estrutura do garçom: pensada para o celular, com navegação fixa embaixo. */
export function CascaGarcom({ children }: { children: React.ReactNode }) {
  const { estado } = useLoja();
  const pathname = usePathname();

  if (estado.perfil !== "garcom") {
    return <AcessoPerfil esperado="garcom" />;
  }

  const abas = [
    { href: "/garcom", rotulo: "Comandas", icone: ClipboardList, exato: true },
    { href: "/garcom/nova", rotulo: "Nova comanda", icone: Plus },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
          <div className="flex flex-col">
            <Logo />
            <p className="-mt-1 pl-10 text-xs text-muted-foreground">{NOME_PERFIL.garcom}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/inicio" className="text-xs underline underline-offset-4">
              Trocar perfil
            </Link>
            <ThemeSwitcher />
          </div>
        </div>
      </header>
      <AvisoExemplo />
      <main className="mx-auto w-full max-w-3xl flex-1 p-4 pb-28">{children}</main>
      <nav
        aria-label="Navegação do garçom"
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-card pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto grid max-w-3xl grid-cols-2">
          {abas.map(({ href, rotulo, icone: Icone, exato }) => {
            const ativa = exato
              ? pathname === href || pathname.startsWith("/garcom/comanda")
              : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={ativa ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium",
                  ativa ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icone className="h-5 w-5" />
                {rotulo}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
