import { CascaPainel } from "@/components/contabar/casca-painel";

// Na demonstração não há conta real: o menu de conta (AuthButton) volta a ser
// usado quando as telas forem ligadas ao banco e ao login.
export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return <CascaPainel>{children}</CascaPainel>;
}
