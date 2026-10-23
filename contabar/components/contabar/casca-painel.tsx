"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ClipboardList,
  HandCoins,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useLoja } from "@/lib/contabar/loja";
import { existemDividas } from "@/lib/contabar/regras";
import { NOME_PERFIL } from "@/lib/contabar/tipos";
import { AcessoPerfil } from "./acesso-perfil";
import { AvisoExemplo } from "./aviso-exemplo";
import { Logo } from "./logo";

/** Estrutura do painel do administrador: menu lateral no computador, menu recolhível no celular. */
export function CascaPainel({
  children,
  contaSlot,
}: {
  children: React.ReactNode;
  contaSlot?: React.ReactNode;
}) {
  const { estado } = useLoja();
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);

  if (estado.perfil !== "administrador") {
    return <AcessoPerfil esperado="administrador" />;
  }

  // O fiado aparece se o bar usa fiado OU se ainda existem dívidas antigas.
  const mostrarFiado = estado.configuracoes.fiadoAtivo || existemDividas(estado);

  const links = [
    { href: "/painel", rotulo: "Painel", icone: LayoutDashboard, exato: true },
    { href: "/painel/vendas", rotulo: "Vendas", icone: ShoppingCart },
    { href: "/painel/comandas", rotulo: "Comandas", icone: ClipboardList },
    { href: "/painel/caixa", rotulo: "Caixa", icone: Wallet },
    ...(mostrarFiado
      ? [{ href: "/painel/fiado", rotulo: "Fiado", icone: HandCoins }]
      : []),
    { href: "/painel/produtos", rotulo: "Produtos", icone: Package },
    { href: "/painel/configuracoes", rotulo: "Configurações", icone: Settings },
  ];

  const ativo = (href: string, exato?: boolean) =>
    exato ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const navegacao = (aoClicar?: () => void) => (
    <nav className="grid gap-1" aria-label="Menu principal">
      {links.map(({ href, rotulo, icone: Icone, exato }) => {
        const isAtivo = ativo(href, exato);
        return (
          <Link
            key={href}
            href={href}
            onClick={aoClicar}
            aria-current={isAtivo ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              isAtivo
                ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icone className={cn("h-4 w-4", isAtivo ? "text-amber" : "text-muted-foreground")} />
            {rotulo}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r bg-card p-4 md:flex">
        <div className="space-y-6">
          <div className="space-y-1">
            <Logo />
            <p className="text-xs text-muted-foreground">{estado.estabelecimentoNome}</p>
          </div>
          {navegacao()}
        </div>
        <div className="space-y-3 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Perfil: <strong>{NOME_PERFIL.administrador}</strong>
          </p>
          <div className="flex gap-3 text-xs">
            <Link href="/inicio" className="underline underline-offset-4">
              Trocar perfil
            </Link>
            <a href="/privacidade" className="underline underline-offset-4">
              Privacidade
            </a>
          </div>
          <div className="break-all text-xs [&>div]:flex-wrap [&>div]:gap-2">
            {contaSlot}
          </div>
          <ThemeSwitcher />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
          <Logo />
          <button
            type="button"
            onClick={() => setMenuAberto((v) => !v)}
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuAberto}
            className="rounded-md p-2 hover:bg-accent"
          >
            {menuAberto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>
        {menuAberto && (
          <div className="space-y-3 border-b bg-card p-3 md:hidden">
            {navegacao(() => setMenuAberto(false))}
            <div className="flex items-center justify-between border-t pt-3">
              <Link href="/inicio" className="text-xs underline underline-offset-4">
                Trocar perfil
              </Link>
              <ThemeSwitcher />
            </div>
            <div className="break-all text-xs [&>div]:flex-wrap [&>div]:gap-2">
              {contaSlot}
            </div>
          </div>
        )}
        <AvisoExemplo />
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
