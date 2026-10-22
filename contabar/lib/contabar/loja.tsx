"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { criarEstadoExemplo } from "./exemplo";
import type { Estado, ResultadoAcao } from "./tipos";
import { VERSAO_ESTADO } from "./tipos";

/**
 * Armazenamento TEMPORÁRIO dos dados de exemplo.
 *
 * Enquanto o banco do Supabase não for migrado, o estado fica só neste
 * navegador (localStorage). Duas abas do mesmo navegador sincronizam entre si,
 * o que permite ver o painel do administrador atualizar enquanto o garçom lança
 * itens em outra aba. Nada daqui vai para o Supabase.
 */

const CHAVE = "contabar-exemplo-v1";

type Retorno<T> = { ok: true; valor: T } | { ok: false; erro: string };

interface Contexto {
  estado: Estado;
  executar: <T>(acao: (e: Estado) => ResultadoAcao<T>) => Retorno<T>;
  restaurarExemplo: () => void;
}

const Ctx = createContext<Contexto | null>(null);

function lerSalvo(bruto: string | null): Estado | null {
  if (!bruto) return null;
  try {
    const dados = JSON.parse(bruto) as Estado;
    return dados?.versao === VERSAO_ESTADO ? dados : null;
  } catch {
    return null;
  }
}

export function LojaProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<Estado | null>(null);
  const ref = useRef<Estado | null>(null);

  const persistir = useCallback((novo: Estado) => {
    ref.current = novo;
    setEstado(novo);
    try {
      localStorage.setItem(CHAVE, JSON.stringify(novo));
    } catch {
      // sem armazenamento disponível: o exemplo continua só em memória
    }
  }, []);

  useEffect(() => {
    let salvo: Estado | null = null;
    try {
      salvo = lerSalvo(localStorage.getItem(CHAVE));
    } catch {
      salvo = null;
    }
    persistir(salvo ?? criarEstadoExemplo());

    function aoMudarArmazenamento(ev: StorageEvent) {
      if (ev.key !== CHAVE) return;
      const novo = lerSalvo(ev.newValue);
      if (novo) {
        ref.current = novo;
        setEstado(novo);
      }
    }
    window.addEventListener("storage", aoMudarArmazenamento);
    return () => window.removeEventListener("storage", aoMudarArmazenamento);
  }, [persistir]);

  const executar = useCallback(
    <T,>(acao: (e: Estado) => ResultadoAcao<T>): Retorno<T> => {
      const atual = ref.current;
      if (!atual) return { ok: false, erro: "O sistema ainda está carregando" };
      const r = acao(atual);
      if (!r.ok) return { ok: false, erro: r.erro };
      persistir(r.estado);
      return { ok: true, valor: r.valor };
    },
    [persistir],
  );

  const restaurarExemplo = useCallback(() => {
    const perfil = ref.current?.perfil ?? null;
    persistir({ ...criarEstadoExemplo(), perfil });
  }, [persistir]);

  const valor = useMemo<Contexto | null>(
    () => (estado ? { estado, executar, restaurarExemplo } : null),
    [estado, executar, restaurarExemplo],
  );

  if (!valor) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando o ContaBar…
      </div>
    );
  }
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useLoja(): Contexto {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLoja deve ser usado dentro do LojaProvider");
  return ctx;
}
