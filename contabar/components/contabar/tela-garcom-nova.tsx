"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { abrirComanda, salvarCliente } from "@/lib/contabar/acoes";
import { useLoja } from "@/lib/contabar/loja";
import { nomeCliente } from "@/lib/contabar/regras";
import { Campo, Mensagem, Pagina, Selecao } from "./ui";

export function TelaGarcomNova() {
  const { estado, executar } = useLoja();
  const router = useRouter();
  const [rotulo, setRotulo] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [novoCliente, setNovoCliente] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const pode = estado.configuracoes.garcomCadastraClientes;

  function cadastrarCliente() {
    setErro(null);
    const r = executar((e) => salvarCliente(e, { nome: novoCliente }));
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setClienteId(r.valor);
    setNovoCliente("");
  }

  function abrir() {
    setErro(null);
    const r = executar((e) =>
      abrirComanda(e, { rotulo, clienteId: clienteId || undefined }),
    );
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    router.push(`/garcom/comanda/${r.valor}`);
  }

  return (
    <Pagina titulo="Nova comanda">
      <div className="space-y-5">
        <Campo rotulo="Mesa ou identificação">
          <Input
            className="h-12 text-base"
            value={rotulo}
            onChange={(e) => setRotulo(e.target.value)}
            placeholder="Ex.: Mesa 4"
          />
        </Campo>
        <Campo
          rotulo="Cliente (opcional)"
          dica={
            estado.configuracoes.fiadoAtivo
              ? "Escolha o cliente para poder lançar na conta (fiado)."
              : "Opcional: serve só para identificar a comanda."
          }
        >
          <Selecao
            className="h-12 text-base"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
          >
            <option value="">Sem cliente</option>
            {estado.clientes
              .filter((c) => c.ativo)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {nomeCliente(c)}
                </option>
              ))}
          </Selecao>
        </Campo>

        {pode && (
          <div className="space-y-2 rounded-lg border p-3">
            <Campo rotulo="Cliente novo">
              <Input
                className="h-12 text-base"
                value={novoCliente}
                onChange={(e) => setNovoCliente(e.target.value)}
                placeholder="Nome do cliente"
              />
            </Campo>
            <Button variant="outline" className="h-11" onClick={cadastrarCliente} disabled={!novoCliente.trim()}>
              Cadastrar cliente
            </Button>
          </div>
        )}

        {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
        <Button className="h-12 w-full text-base" onClick={abrir}>
          Abrir comanda
        </Button>
      </div>
    </Pagina>
  );
}
