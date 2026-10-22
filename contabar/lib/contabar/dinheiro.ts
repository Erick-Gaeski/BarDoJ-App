const formatadorBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** 1250 -> "R$ 12,50" */
export function formatarBRL(centavos: number): string {
  return formatadorBRL.format(centavos / 100);
}

/** 1250 -> "12,50" (para preencher campos de texto) */
export function centavosParaTexto(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

/**
 * Converte o que a pessoa digitou ("12,50", "12.5", "1.234,56") em centavos.
 * Devolve null se o texto não for um valor válido.
 */
export function paraCentavos(texto: string): number | null {
  let t = texto.replace(/[^\d,.]/g, "").trim();
  if (!t) return null;
  if (t.includes(",")) {
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, "");
  }
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
