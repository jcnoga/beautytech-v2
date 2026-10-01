import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, normalize, sep } from "node:path";

// Só no ambiente local (dev-local/web.sh): serve os arquivos enviados de dev-local/uploads,
// papel que o nginx do zensalon-web faz na VPS. A API só grava, não serve /uploads.
const LOCAL_UPLOADS = join(__dirname, "..", "dev-local", "uploads");
const UPLOAD_TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", svg: "image/svg+xml", pdf: "application/pdf" };
const localUploads = {
  name: "zs-local-uploads",
  apply: "serve" as const,
  configureServer(server: any) {
    if (!process.env.ZS_LOCAL_API) return;
    server.middlewares.use("/uploads", (req: any, res: any, next: any) => {
      const file = join(LOCAL_UPLOADS, normalize(decodeURIComponent((req.url ?? "").split("?")[0])));
      if (!file.startsWith(LOCAL_UPLOADS + sep) || !existsSync(file) || !statSync(file).isFile()) return next();
      res.setHeader("Content-Type", UPLOAD_TYPES[file.split(".").pop()!.toLowerCase()] ?? "application/octet-stream");
      createReadStream(file).pipe(res);
    });
  },
};

export default defineConfig({
  plugins: [
    react(),
    localUploads,
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
    // Só no ambiente local (dev-local/web.sh): API e GoTrue locais pelo mesmo endereço,
    // como o Traefik faz na VPS (/uploads: plugin zs-local-uploads acima). Não afeta o build de produção.
    proxy: process.env.ZS_LOCAL_API ? {
      "/api": process.env.ZS_LOCAL_API,
      "/auth/v1": { target: process.env.ZS_LOCAL_GOTRUE, changeOrigin: true, rewrite: (p: string) => p.replace(/^\/auth\/v1/, "") },
    } : undefined,
  },
});
