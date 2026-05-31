import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env.js";
import { checkDatabaseHealth, closeDatabaseConnection } from "./db/connection.js";
import { authenticate } from "./middleware/auth.js";

const server = Fastify({ logger: { level: env.LOG_LEVEL } });

async function bootstrap() {
  await server.register(helmet, { global: true });
  await server.register(cors, { origin: env.CORS_ORIGINS, credentials: true });
  await server.register(rateLimit, { max: env.RATE_LIMIT_MAX, timeWindow: env.RATE_LIMIT_WINDOW });
  server.decorate("authenticate", authenticate);
  server.get("/health", async () => {
    const dbOk = await checkDatabaseHealth();
    return { status: dbOk ? "healthy" : "degraded", timestamp: new Date().toISOString(), version: "2.0.0", environment: env.NODE_ENV, database: dbOk ? "connected" : "disconnected", uptime: Math.floor(process.uptime()) };
  });
  await server.listen({ port: env.PORT, host: env.HOST });
  console.log("BeautyTech v2 rodando na porta " + env.PORT);
}

process.on("SIGTERM", async () => { await server.close(); await closeDatabaseConnection(); process.exit(0); });
bootstrap().catch((err) => { console.error(err); process.exit(1); });