// Controle de funcionalidades por nicho no backend.
// installFeatureGuard() registra um hook onRoute: toda rota que tem `authenticate` no preHandler
// recebe, logo depois dele, um requireFeature(<feature da rota>) conforme ROUTE_FEATURES.
// Rotas sem `authenticate` (públicas, webhooks, esqueci a senha) e as do Super Admin ficam de fora.
// Rota com login sem feature mapeada é NEGADA (e o teste de cobertura acusa).
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { authenticate } from "./auth.js";
import { featureForPath, isFeatureAllowed, normalizeBusinessType, type Feature } from "../config/features.js";

export interface GuardedRoute { method: string; url: string; feature: Feature | null }

export function requireFeature(feature: Feature | null) {
  return async function requireFeature(req: FastifyRequest, reply: FastifyReply) {
    if (reply.sent) return;
    const raw = req.tenantContext?.businessType;
    const businessType = normalizeBusinessType(raw);
    if (!businessType) console.warn(`[NICHO] business_type desconhecido "${raw}" (tenant ${req.tenantContext?.tenantId}): acesso negado`);
    if (!isFeatureAllowed(feature, businessType)) {
      return reply.status(403).send({ success: false, error: "Recurso não disponível para o seu tipo de negócio", code: "FEATURE_NOT_ALLOWED" });
    }
  };
}

/** Instala o guard e devolve a lista (preenchida à medida que as rotas são registradas) das rotas protegidas. */
export function installFeatureGuard(app: FastifyInstance, prefix: string): GuardedRoute[] {
  const guarded: GuardedRoute[] = [];
  app.addHook("onRoute", (route) => {
    const pre = ([] as any[]).concat(route.preHandler ?? []);
    const at = pre.indexOf(authenticate);
    if (at < 0) return;
    const path = route.url.startsWith(prefix) ? route.url.slice(prefix.length) : route.url;
    const feature = featureForPath(path);
    pre.splice(at + 1, 0, requireFeature(feature));
    route.preHandler = pre;
    for (const method of ([] as string[]).concat(route.method)) {
      if (method !== "HEAD") guarded.push({ method, url: route.url, feature });
    }
  });
  return guarded;
}
