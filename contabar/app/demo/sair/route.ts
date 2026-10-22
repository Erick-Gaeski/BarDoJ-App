import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_DEMO } from "@/lib/supabase/proxy";

/** Sai da demonstração: apaga o cookie e volta para a página inicial. */
export function GET(request: NextRequest) {
  const resposta = NextResponse.redirect(new URL("/", request.url));
  resposta.cookies.delete(COOKIE_DEMO);
  return resposta;
}
