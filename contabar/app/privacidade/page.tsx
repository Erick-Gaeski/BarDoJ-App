import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/contabar/logo";

export const metadata: Metadata = {
  title: "Política de privacidade · ContaBar",
  description:
    "Como o ContaBar trata dados na demonstração, no login e nas funções previstas para o banco de dados.",
};

/** Campo que o responsável precisa preencher antes de divulgar este documento. */
function Preencher({ children }: { children: React.ReactNode }) {
  return (
    <mark className="rounded bg-amber-200 px-1 font-medium text-black dark:bg-amber-900 dark:text-black">
      [PREENCHER: {children}]
    </mark>
  );
}

function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">{titulo}</h2>
      {children}
    </section>
  );
}

const lista = "list-disc space-y-1.5 pl-6";

export default function Privacidade() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 p-5 py-10">
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="ContaBar, página inicial">
            <Logo />
          </Link>
          <Link href="/" className="text-sm underline underline-offset-4">
            Voltar
          </Link>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Política de privacidade</h1>
        <p className="text-sm text-muted-foreground">
          Última atualização: 17 de outubro de 2026. Este texto descreve como o
          ContaBar funciona hoje e o que está previsto para a próxima etapa.
        </p>
        <div
          role="note"
          className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-black dark:border-amber-800 dark:bg-amber-950/40 dark:text-black"
        >
          <strong>Documento em preparação.</strong> Os campos destacados em amarelo
          precisam ser preenchidos pelo responsável pelo ContaBar, e o texto deve passar
          por revisão jurídica antes de ser divulgado a clientes.
        </div>
      </header>

      <Secao titulo="1. Quem é o responsável">
        <p>
          O ContaBar é um sistema de controle de vendas, comandas, caixa e fiado para
          bares. O responsável por este serviço é{" "}
          <Preencher>nome ou razão social e CPF/CNPJ</Preencher>, que pode ser contatado
          em <Preencher>e-mail de contato para assuntos de privacidade</Preencher>.
        </p>
        <p>
          Quando um bar usar o ContaBar com dados de seus próprios clientes, o bar
          decide quais dados cadastrar e para quê, e o ContaBar fornece a ferramenta
          para guardá-los e organizá-los.
        </p>
      </Secao>

      <Secao titulo="2. O que acontece hoje">
        <h3 className="font-medium">2.1 Demonstração</h3>
        <ul className={lista}>
          <li>
            A demonstração não pede senha nem e-mail. Todos os nomes, produtos, valores
            e clientes que aparecem são <strong>fictícios</strong>.
          </li>
          <li>
            Tudo o que você faz na demonstração (abrir comandas, lançar itens, fechar o
            caixa) fica guardado <strong>somente no seu navegador</strong>, no
            armazenamento local do site. Nada é enviado a nenhum servidor.
          </li>
          <li>
            Para lembrar que você está na demonstração, o site grava um cookie chamado{" "}
            <code>contabar_demo</code>, com validade de 8 horas. Ele só indica essa
            escolha e não identifica você.
          </li>
          <li>
            Você apaga tudo limpando os dados do site no navegador, ou usando
            “Restaurar dados de exemplo”.
          </li>
        </ul>

        <h3 className="pt-2 font-medium">2.2 Entrar com minha conta</h3>
        <ul className={lista}>
          <li>
            O cadastro e o login usam um serviço de autenticação de terceiros, o{" "}
            <strong>Supabase</strong>. Ele recebe o seu <strong>e-mail</strong> e a sua{" "}
            <strong>senha</strong> para criar a conta e confirmar quem você é. A senha é
            guardada pelo serviço de forma protegida, e o ContaBar não a enxerga.
          </li>
          <li>
            Depois do login, o site guarda <strong>cookies de sessão</strong> para manter
            você conectado. Eles são necessários ao funcionamento do login.
          </li>
          <li>
            Nesta versão, as telas do bar (comandas, caixa, fiado, produtos) ainda{" "}
            <strong>não gravam dados no banco de dados</strong>. Por enquanto, a única
            informação pessoal guardada fora do seu navegador é a da conta de acesso
            (e-mail e senha).
          </li>
        </ul>

        <h3 className="pt-2 font-medium">2.3 Preferências do site</h3>
        <p>
          A escolha entre tema claro e escuro é guardada no seu navegador, sem envio a
          servidor.
        </p>

        <h3 className="pt-2 font-medium">2.4 O que o ContaBar não faz</h3>
        <ul className={lista}>
          <li>Não exibe anúncios e não usa ferramentas de análise de comportamento.</li>
          <li>Não vende nem aluga dados a terceiros.</li>
          <li>
            Não carrega fontes ou scripts de terceiros para acompanhar sua navegação.
          </li>
        </ul>
      </Secao>

      <Secao titulo="3. O que está previsto quando o banco de dados for conectado">
        <p>
          Esta parte descreve a próxima etapa e <strong>ainda não está ativa</strong>.
          Quando o ContaBar passar a gravar os dados do bar, ele tratará:
        </p>
        <ul className={lista}>
          <li>
            <strong>Bar e equipe:</strong> nome do bar, nome de exibição, login e perfil
            (administrador ou garçom) de cada pessoa da equipe.
          </li>
          <li>
            <strong>Operação:</strong> produtos e preços, comandas, itens lançados,
            recebimentos, turnos de caixa e movimentos de caixa.
          </li>
          <li>
            <strong>Clientes e fiado (opcional por bar):</strong> nome, apelido,
            telefone (opcional) e o histórico de consumos e pagamentos de cada cliente.
          </li>
          <li>
            <strong>Registro de autoria:</strong> cada lançamento guarda quem o fez e
            quando, para que o bar saiba quem registrou cada pedido ou pagamento.
          </li>
        </ul>
        <p>
          Os dados de um bar são separados dos de outros bares por regras no próprio
          banco de dados. O garçom não vê o caixa nem o saldo dos clientes, e o telefone
          dos clientes só aparece ao garçom se o bar ativar essa opção.
        </p>
        <p>
          <strong>Registros financeiros não são apagados nem editados.</strong> Uma
          correção é feita por cancelamento ou estorno, que ficam registrados junto do
          original. Por isso, pedidos de eliminação de dados serão analisados caso a
          caso, considerando a necessidade de manter esses registros.
        </p>
      </Secao>

      <Secao titulo="4. Com quem os dados são compartilhados">
        <ul className={lista}>
          <li>
            <strong>Supabase:</strong> autenticação hoje e, na próxima etapa, também o
            banco de dados. Dependendo da região do projeto, os dados podem ficar em
            servidores fora do Brasil.
          </li>
          <li>
            <strong>Provedor de hospedagem do site:</strong>{" "}
            <Preencher>
              informar o provedor quando o site for publicado, ou remover este item
            </Preencher>
            .
          </li>
          <li>
            Autoridades, quando houver obrigação legal ou ordem judicial.
          </li>
        </ul>
      </Secao>

      <Secao titulo="5. Por quanto tempo guardamos">
        <ul className={lista}>
          <li>
            <strong>Demonstração:</strong> até você limpar o navegador ou restaurar os
            dados de exemplo; o cookie da demonstração expira em 8 horas.
          </li>
          <li>
            <strong>Conta de acesso:</strong> enquanto a conta existir.
          </li>
          <li>
            <strong>Dados do bar (quando ativos):</strong> enquanto o bar usar o
            ContaBar e pelo prazo necessário para registros financeiros e obrigações
            legais.
          </li>
        </ul>
      </Secao>

      <Secao titulo="6. Seus direitos">
        <p>
          Pela Lei Geral de Proteção de Dados (Lei 13.709/2018), você pode pedir:
          confirmação de que tratamos seus dados, acesso, correção de dados
          incompletos ou desatualizados, anonimização, bloqueio ou eliminação quando
          cabível, portabilidade, informação sobre com quem compartilhamos, e a
          revogação de consentimentos dados. Também pode reclamar à Autoridade Nacional
          de Proteção de Dados (ANPD).
        </p>
        <p>
          Para exercer esses direitos, escreva para{" "}
          <Preencher>e-mail de contato</Preencher>. Se você é cliente de um bar,
          também pode falar diretamente com o bar, que decide sobre os dados dos seus
          clientes.
        </p>
      </Secao>

      <Secao titulo="7. Segurança">
        <ul className={lista}>
          <li>
            O ContaBar ainda não foi publicado na internet. Quando for, o acesso será
            feito por conexão criptografada (HTTPS).
          </li>
          <li>
            As senhas ficam com o serviço de autenticação e não são acessíveis ao
            ContaBar.
          </li>
          <li>
            Na etapa do banco de dados, o isolamento entre bares e as permissões por
            perfil serão aplicados no próprio banco, e não apenas nas telas.
          </li>
        </ul>
      </Secao>

      <Secao titulo="8. Crianças e adolescentes">
        <p>
          O ContaBar é uma ferramenta de trabalho para bares e não é direcionado a
          menores de 18 anos.
        </p>
      </Secao>

      <Secao titulo="9. Mudanças nesta política">
        <p>
          Quando o ContaBar passar a tratar dados novos, como na conexão com o banco de
          dados, esta política será atualizada antes, e a data no topo será alterada.
        </p>
      </Secao>

      <footer className="border-t pt-6 text-sm text-muted-foreground">
        <Link href="/" className="underline underline-offset-4">
          Voltar para a página inicial
        </Link>
      </footer>
    </main>
  );
}
