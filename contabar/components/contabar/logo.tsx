import { cn } from "@/lib/utils";

/** Marca do ContaBar: caneca de chope com as linhas de uma conta. */
export function LogoMarca({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="ContaBar"
      className={cn("h-8 w-8 shrink-0", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="14" fill="#D97706" />
      <path d="M18 24h22v20a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6V24z" fill="#FFF7ED" />
      <path
        d="M40 28h3a5 5 0 0 1 0 10h-3"
        fill="none"
        stroke="#FFF7ED"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="23" cy="21" r="5" fill="#FFF7ED" />
      <circle cx="30" cy="18" r="6" fill="#FFF7ED" />
      <circle cx="36" cy="21" r="4.5" fill="#FFF7ED" />
      <path d="M24 32h10M24 38h10" stroke="#D97706" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Marca com o nome ao lado. */
export function Logo({
  className,
  mostrarNome = true,
}: {
  className?: string;
  mostrarNome?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMarca />
      {mostrarNome && (
        <span className="text-lg font-bold tracking-tight">ContaBar</span>
      )}
    </span>
  );
}
