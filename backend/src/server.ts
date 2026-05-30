import Fastify   from "fastify";
import cors      from "@fastify/cors";
import helmet    from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env }   from "@config/env";
import { checkDatabaseHealth, closeDatabaseConnection } from "@db/connection";
import { authenticate } from "@middleware/auth";
 
const server = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    transport: env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
  },
});
 
async function bootstrap() {
  await server.register(helmet, { global: true });
  await server.register(cors, { origin: env.CORS_ORIGINS, credentials: true });
  await server.register(rateLimit, { max: env.RATE_LIMIT_MAX, timeWindow: env.RATE_LIMIT_WINDOW });
 
  server.decorate("authenticate", authenticate);
 
  server.get("/health", async () => {
    const dbOk = await checkDatabaseHealth();
    return {
      status:      dbOk ? "healthy" : "degraded",
      timestamp:   new Date().toISOString(),
      version:     "2.0.0",
      environment: env.NODE_ENV,
      database:    dbOk ? "connected" : "disconnected",
      uptime:      Math.floor(process.uptime()),
    };
  });
 
  // Registre seus módulos aqui:
  // await server.register(clientsModule, { prefix: env.API_PREFIX });
  // await server.register(professionalsModule, { prefix: env.API_PREFIX });
  // etc.
 
  await server.listen({ port: env.PORT, host: env.HOST });
  console.log(`🚀 BeautyTech v2 API em http://${env.HOST}:${env.PORT}`);
  console.log(`🏥 Health: http://${env.HOST}:${env.PORT}/health`);
}
 
process.on("SIGTERM", async () => {
  await server.close();
  await closeDatabaseConnection();
  process.exit(0);
});
 
bootstrap().catch((err) => {
  console.error("Erro ao iniciar servidor:", err);
  process.exit(1);
});
