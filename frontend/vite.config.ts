import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        navigateFallbackDenylist: [
          /^\/manual\//,
          /\.pdf$/,
          // VPS: GoTrue, API e arquivos enviados ficam no mesmo dominio
          /^\/auth\//,
          /^\/api\//,
          /^\/uploads\//,
        ],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkOnly",
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/manual/"),
            handler: "NetworkOnly",
          },
        ],
      },
      manifest: {
        name: "ZenSalon",
        short_name: "ZenSalon",
        description: "Gestao completa para saloes de beleza, barbearias, clinicas de estetica e studios de Pilates",
        theme_color: "#0B0F1A",
        background_color: "#0B0F1A",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    // Só no ambiente local (dev-local/web.sh): API, uploads e GoTrue locais pelo mesmo endereço,
    // como o Traefik faz na VPS. Não afeta o build de produção.
    proxy: process.env.ZS_LOCAL_API ? {
      "/api": process.env.ZS_LOCAL_API,
      "/uploads": process.env.ZS_LOCAL_API,
      "/auth/v1": { target: process.env.ZS_LOCAL_GOTRUE, changeOrigin: true, rewrite: (p: string) => p.replace(/^\/auth\/v1/, "") },
    } : undefined,
  },
});
