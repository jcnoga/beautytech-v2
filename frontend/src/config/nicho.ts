// Controle de funcionalidades por nicho no frontend (espelho do guard do backend).
// O App chama setCurrentBusinessType() com o business_type de /auth/me; as telas usam can().
// Enquanto /auth/me não chega, vale o padrão (beauty_salon), igual ao comportamento antigo.
// Esconder aqui é só conforto: quem garante o bloqueio é o backend (403 FEATURE_NOT_ALLOWED).
import { isFeatureAllowed, normalizeBusinessType, type Feature } from "./features";

let current: unknown = null;

export function setCurrentBusinessType(value: unknown) {
  current = value;
}

/** A funcionalidade está liberada para o nicho da empresa logada? Sem feature = negada. */
export function can(feature: Feature | undefined, businessType: unknown = current): boolean {
  return isFeatureAllowed(feature, normalizeBusinessType(businessType));
}
