// BeautyTech v2 - 2026-06-01
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { sendWelcomeEmail } from "./modules/email.module.js";
import { loadPlansFromDb } from "./modules/billing/billing.service.js";

import { env } from "./config/env.js";
import { rateLimitErrorResponse } from "./config/rate-limit.js";
import { checkDatabaseHealth, closeDatabaseConnection } from "./db/connection.js";
import { startScheduler } from "./jobs/scheduler.js";
import { authenticate } from "./middleware/auth.js";

import { API_MODULES } from "./api-modules.js";
import { installFeatureGuard } from "./middleware/feature-guard.js";

const server = Fastify({
  logger: { level: env.LOG_LEVEL },
  // Atrás do Traefik: sem isso, req.ip (e o rate limit) seria o do proxy para todo mundo.
  trustProxy: env.TRUST_PROXY || false,
});

async function bootstrap() {
  await server.register(helmet, { global: true });
  await server.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      cb(null, true);
    },
    credentials: true,
  });
  server.addContentTypeParser('application/json', { parseAs: 'string' }, function (req, body, done) {
    if (!body || (body as string).length === 0) { done(null, {}); return; }
    try { done(null, JSON.parse(body as string)); } catch(e: any) { done(e, undefined); }
  });
  await server.register(rateLimit, { max: env.RATE_LIMIT_MAX, timeWindow: env.RATE_LIMIT_WINDOW, errorResponseBuilder: rateLimitErrorResponse });

  server.decorate("authenticate", authenticate);

  server.get("/health", async () => {
    const dbOk = await checkDatabaseHealth();
    return {
      status: dbOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: "2.0.1",
      environment: env.NODE_ENV,
      database: dbOk ? "connected" : "disconnected",
      uptime: Math.floor(process.uptime()),
    };
  });

  const prefix = env.API_PREFIX;
  // Controle de funcionalidades por nicho: instalado antes dos módulos para valer em todas as rotas.
  installFeatureGuard(server, prefix);
  for (const mod of API_MODULES) await server.register(mod as any, { prefix });

  await loadPlansFromDb();
  await server.listen({ port: env.PORT, host: env.HOST });
  console.log(`BeautyTech v2 rodando na porta ${env.PORT}`);
  if (env.JOBS_ENABLED) startScheduler();
  else console.log("[Scheduler] Jobs automaticos DESLIGADOS (JOBS_ENABLED=false).");
}

process.on("SIGTERM", async () => {
  await server.close();
  await closeDatabaseConnection();
  process.exit(0);
});

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});

