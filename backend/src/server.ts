// BeautyTech v2 - 2026-06-01
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env.js";
import { checkDatabaseHealth, closeDatabaseConnection } from "./db/connection.js";
import { authenticate } from "./middleware/auth.js";

import {
  clientsModule,
  professionalsModule,
  appointmentsModule,
  servicesModule,
  packagesModule,
  financialModule,
  commissionsModule,
  dashboardModule,
  crmModule,
  loyaltyModule,
  campaignsModule,
  productsModule,
  authModule,
  superAdminModule,
} from "./modules/all-modules.js";

const server = Fastify({ logger: { level: env.LOG_LEVEL } });

async function bootstrap() {
  await server.register(helmet, { global: true });
  await server.register(cors, { origin: env.CORS_ORIGINS, credentials: true });
  await server.register(rateLimit, { max: env.RATE_LIMIT_MAX, timeWindow: env.RATE_LIMIT_WINDOW });

  server.decorate("authenticate", authenticate);

  server.get("/health", async () => {
    const dbOk = await checkDatabaseHealth();
    return {
      status: dbOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: "2.0.0",
      environment: env.NODE_ENV,
      database: dbOk ? "connected" : "disconnected",
      uptime: Math.floor(process.uptime()),
    };
  });

  // Registrar todos os módulos com prefixo /api/v1
const prefix = env.API_PREFIX;
  await server.register(authModule,          { prefix });
  await server.register(clientsModule,       { prefix });

  await server.register(professionalsModule, { prefix });
  await server.register(appointmentsModule,  { prefix });
  await server.register(servicesModule,      { prefix });
  await server.register(packagesModule,      { prefix });
  await server.register(financialModule,     { prefix });
  await server.register(commissionsModule,   { prefix });
  await server.register(dashboardModule,     { prefix });
  console.log("Rotas registradas:", server.printRoutes());
  await server.register(crmModule,           { prefix });
  await server.register(loyaltyModule,       { prefix });
  await server.register(campaignsModule,     { prefix });
  await server.register(productsModule,      { prefix });
  await server.register(superAdminModule,    { prefix });

  await server.listen({ port: env.PORT, host: env.HOST });
  console.log(`BeautyTech v2 rodando na porta ${env.PORT}`);
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