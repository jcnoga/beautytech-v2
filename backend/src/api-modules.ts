// Módulos da API, na ordem de registro. Usado pelo server.ts e pelos testes (cobertura do controle
// de nichos), para que o teste confira exatamente as rotas que rodam em produção.
import { teamModule } from "./modules/team.module.js";
import { uploadsModule } from "./modules/uploads.module.js";
import { prospectModule } from "./modules/prospect.module.js";
import { billingRoutes } from "./modules/billing/billing.routes.js";
import { professionalScheduleRoutes } from "./modules/professionals/professional-schedule.routes.js";
import { publicBookingModule } from "./modules/appointments/appointments.routes.js";
import { autoReplyController } from "./modules/auto-reply/auto-reply.controller.js";
import { salonProfilePublicModule } from "./modules/salon-profile/salon-profile.routes.js";
import { tenantPublicModule } from "./modules/tenant/tenant-public.routes.js";
import {
  clientsModule, demoModule, professionalsModule, appointmentsModule, servicesModule, packagesModule,
  financialModule, commissionsModule, dashboardModule, crmModule, loyaltyModule, campaignsModule,
  productsModule, authModule, superAdminModule, automationsModule, whatsappModule, clientRecordsModule,
  consentFormsModule, appointmentPhotosModule, protocolsModule, protocolSessionsModule,
  treatmentPackagesModule, packageSessionsModule,
} from "./modules/all-modules.js";

export const API_MODULES = [
  authModule,
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
  superAdminModule,
  prospectModule,
  automationsModule,
  whatsappModule,
  teamModule,
  uploadsModule,
  clientRecordsModule,
  consentFormsModule,
  appointmentPhotosModule,
  protocolsModule,
  protocolSessionsModule,
  treatmentPackagesModule,
  packageSessionsModule,
  demoModule,
  billingRoutes,
  professionalScheduleRoutes,
  // asaasModule desativado - substituido por billingRoutes
  publicBookingModule,
  autoReplyController,
  salonProfilePublicModule,
  tenantPublicModule,
] as const;
