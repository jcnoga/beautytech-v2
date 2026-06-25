// BeautyTech v2 - 2026-06-01
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
// asaasModule substituido por billingRoutes
import { sendWelcomeEmail } from "./modules/email.module.js";
import { prospectModule } from "./modules/prospect.module.js";
import { billingRoutes } from "./modules/billing/billing.routes.js";
import { professionalScheduleRoutes } from "./modules/professionals/professional-schedule.routes.js";
import { loadPlansFromDb } from "./modules/billing/billing.service.js";

import { publicBookingModule } from "./modules/appointments/appointments.routes.js";
import { tenantPublicModule } from "./modules/tenant/tenant-public.routes.js";
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
  protocolSessionsModule,
  treatmentPackagesModule,
  packageSessionsModule,
} from "./modules/all-modules.js";

const server = Fastify({ logger: { level: env.LOG_LEVEL } });

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

  const prefix = env.API_PREFIX;
  await server.register(authModule,               { prefix });
  await server.register(clientsModule,            { prefix });
  await server.register(professionalsModule,      { prefix });
  await server.register(appointmentsModule,       { prefix });
  await server.register(servicesModule,           { prefix });
  await server.register(packagesModule,           { prefix });
  await server.register(financialModule,          { prefix });
  await server.register(commissionsModule,        { prefix });
  await server.register(dashboardModule,          { prefix });
  await server.register(crmModule,                { prefix });
  await server.register(loyaltyModule,            { prefix });
  await server.register(campaignsModule,          { prefix });
  await server.register(productsModule,           { prefix });
  await server.register(superAdminModule,         { prefix });
  await server.register(prospectModule,          { prefix });
  await server.register(automationsModule,        { prefix });
  await server.register(whatsappModule,           { prefix });
  await server.register(teamModule,              { prefix });
  await server.register(clientRecordsModule,      { prefix });
  await server.register(consentFormsModule,       { prefix });
  await server.register(appointmentPhotosModule,  { prefix });
  await server.register(protocolsModule,          { prefix });
  await server.register(protocolSessionsModule,   { prefix });
  await server.register(treatmentPackagesModule,  { prefix });
  await server.register(packageSessionsModule,    { prefix });
  await server.register(demoModule,               { prefix });
  await server.register(billingRoutes,            { prefix });
  await server.register(professionalScheduleRoutes, { prefix });
  // asaasModule desativado - substituido por billingRoutes
  await server.register(publicBookingModule,      { prefix });
  await server.register(tenantPublicModule,       { prefix });

  await loadPlansFromDb();
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

