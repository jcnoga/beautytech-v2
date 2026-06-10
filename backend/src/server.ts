// BeautyTech v2 - 2026-06-01
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { asaasModule } from "./modules/asaas.module.js";
import { publicBookingModule } from "./modules/appointments/appointments.routes.js";
import { publicBookingModule } from "./modules/appointments/appointments.routes.js";
import { env } from "./config/env.js";
import { checkDatabaseHealth, closeDatabaseConnection } from "./db/connection.js";
import { startScheduler } from "./jobs/scheduler.js";
import { authenticate } from "./middleware/auth.js";

import {
  clientsModule,
  demoModule,
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
  automationsModule,
  whatsappModule,
  clientRecordsModule,
  consentFormsModule,
  appointmentPhotosModule,
  protocolsModule,
} from "./modules/all-modules.js";


const server = Fastify({ logger: { level: env.LOG_LEVEL } });

async function bootstrap() {
  await server.register(helmet, { global: true });
  await server.register(cors, { origin: env.CORS_ORIGINS, credentials: true });
  server.addContentTypeParser('application/json', { parseAs: 'string' }, function (req, body, done) {
  if (!body || (body as string).length === 0) { done(null, {}); return; }
  try { done(null, JSON.parse(body as string)); } catch(e: any) { done(e, undefined); }
});
  await server.register(rateLimit, { max: env.RATE_LIMIT_MAX, timeWindow: env.RATE_LIMIT_WINDOW });

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

  // Registrar todos os mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³dulos com prefixo /api/v1
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
  await server.register(automationsModule,   { prefix });
  await server.register(whatsappModule,     { prefix });
  await server.register(clientRecordsModule, { prefix });
  await server.register(consentFormsModule,   { prefix });
  await server.register(appointmentPhotosModule, { prefix });
  await server.register(protocolsModule,          { prefix });
  await server.register(demoModule,          { prefix });
  await server.register(asaasModule,        { prefix });
  await server.register(publicBookingModule, { prefix });
  await server.register(publicBookingModule, { prefix });

  await server.listen({ port: env.PORT, host: env.HOST });
  console.log(`BeautyTech v2 rodando na porta ${env.PORT}`);
  startScheduler();
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

