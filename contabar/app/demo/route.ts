import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_DEMO } from "@/lib/supabase/proxy";

/**
 * Entrada da demonstração: abra /demo (ou use o botão "Entrar na demonstração").
 * Marca a sessão como demonstração e leva para a escolha de perfil. Não usa
 * nenhum serviço de autenticação; as telas trabalham com dados fictícios.
 */
export function GET(request: NextRequest) {
  if (process.env.CONTABAR_DEMO === "off") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  const resposta = NextResponse.redirect(new URL("/inicio", request.url));
  resposta.cookies.set(COOKIE_DEMO, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
    // "Secure" só em HTTPS: o Safari não aceita cookie Secure em http://localhost.
    secure: request.nextUrl.protocol === "https:",
  });
  return resposta;
}
