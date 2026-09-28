// Cliente da API admin do GoTrue próprio (mesma API do Supabase Auth,
// sem o prefixo /auth/v1: GOTRUE_URL já aponta para o container).
import { env } from "./env.js";

/** fetch em `${GOTRUE_URL}${path}` autenticado com a chave service_role. */
export function gotrueAdmin(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${env.GOTRUE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${env.GOTRUE_SERVICE_KEY}`,
      "apikey": env.GOTRUE_SERVICE_KEY,
      ...(init.headers ?? {}),
    },
  });
}

/**
 * Busca usuário do Auth pelo e-mail exato.
 * A API admin ignora ?email= e devolve o usuário mais recente; ?filter= é
 * busca parcial (ILIKE), então a comparação exata é feita aqui.
 */
export async function findAuthUserByEmail(email: string): Promise<{ id: string; email: string } | null> {
  const wanted = email.trim().toLowerCase();
  const res = await gotrueAdmin(`/admin/users?filter=${encodeURIComponent(wanted)}&per_page=50`);
  if (!res.ok) throw new Error(`GoTrue ${res.status} ao buscar usuario`);
  const data = await res.json() as { users?: { id: string; email?: string }[] };
  const user = data.users?.find((u) => u.email?.toLowerCase() === wanted);
  return user ? { id: user.id, email: user.email! } : null;
}
