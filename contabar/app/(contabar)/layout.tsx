import { LojaProvider } from "@/lib/contabar/loja";

// Área do ContaBar (administrador e garçom). O login continua sendo o que já
// existia em /auth; o proxy.ts já exige usuário autenticado nestas rotas.
export default function ContaBarLayout({ children }: { children: React.ReactNode }) {
  return <LojaProvider>{children}</LojaProvider>;
}
