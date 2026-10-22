import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    // O login existente redireciona para /protected depois de entrar.
    // Mantemos o login como está e levamos a pessoa para a tela inicial do ContaBar.
    return [{ source: "/protected", destination: "/inicio", permanent: false }];
  },
};

export default nextConfig;
