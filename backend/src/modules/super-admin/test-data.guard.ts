// Dados de teste (Super Admin): nada de efeito externo para registros de teste.
// Duas camadas:
//  1. Contato fictício, num formato que nunca é real:
//     - telefone com DDD 00 (não existe no Brasil): "(00) 90000-0001" → 00900000001 / 5500900000001;
//     - e-mail no domínio reservado .invalid (RFC 2606, nunca entrega): teste.01@zensalon-teste.invalid.
//     sendTextMessage recusa o número e o cliente do Resend ignora o e-mail, venha o envio de onde vier.
//  2. Registro de teste (id em test_batch_items): os jobs, a fila do WhatsApp, o envio manual e a confirmação de
//     agendamento pulam o cliente antes de montar a mensagem, mesmo que alguém tenha trocado o telefone dele por um real.
// Asaas: só cobra a assinatura da própria conta (não há cobrança de cliente final); conta de teste não assina (commit 6).
import { sql } from "drizzle-orm";

/** Lançado quando um envio vai para um contato fictício de dados de teste. */
export class TestContactBlockedError extends Error {
  constructor(what: string) { super(`Envio bloqueado: ${what} de dados de teste`); this.name = "TestContactBlockedError"; }
}

/**
 * Telefone fictício dos dados de teste: DDD 00 + 9 dígitos (11 no total), com ou sem o 55 do Brasil na frente.
 * Exatamente 11 dígitos para não confundir com um número real discado com o prefixo internacional "00" (0055...).
 */
export function isFakePhone(phone: unknown): boolean {
  const d = String(phone ?? "").replace(/\D/g, "");
  const local = d.length === 13 && d.startsWith("55") ? d.slice(2) : d;
  return local.length === 11 && local.startsWith("00");
}

/** E-mail fictício dos dados de teste: domínio terminado em .invalid. */
export function isFakeEmail(email: unknown): boolean {
  return /@[^@\s]+\.invalid$/i.test(String(email ?? "").trim());
}

/** Contatos fictícios usados pelo gerador de dados de teste (n = 1, 2, ...). */
export const fakePhone = (n: number) => `(00) 90000-${String(n).padStart(4, "0")}`;
export const fakeEmail = (n: number) => `teste.${String(n).padStart(2, "0")}@zensalon-teste.invalid`;

/**
 * Cliente do Resend que ignora destinatários fictícios: se TODOS os destinos forem .invalid, não envia nada;
 * se houver mistura, envia só para os reais.
 */
export function guardResend<T extends { emails: { send: (p: any, ...rest: any[]) => any } }>(client: T): T {
  const original = client.emails.send.bind(client.emails);
  client.emails.send = (payload: any, ...rest: any[]) => {
    const list = (Array.isArray(payload?.to) ? payload.to : [payload?.to]).filter(Boolean);
    const real = list.filter((t: unknown) => !isFakeEmail(t));
    if (list.length > 0 && real.length === 0) {
      return Promise.resolve({ data: null, error: null, skipped: "destinatário de dados de teste" });
    }
    return original(real.length === list.length ? payload : { ...payload, to: real }, ...rest);
  };
  return client;
}

/** Ids (dentre os dados) que são registros de teste de uma tabela. */
export async function testRecordIds(exec: { execute: (q: any) => Promise<any> }, table: string, ids: string[]): Promise<Set<string>> {
  const list = ids.filter(Boolean);
  if (list.length === 0) return new Set();
  const r = await exec.execute(sql`SELECT record_id::text AS id FROM test_batch_items
    WHERE table_name = ${table} AND record_id::text IN (${sql.join(list.map((i) => sql`${i}`), sql`, `)})`);
  const rows = (r as any).rows ?? (Array.isArray(r) ? r : []);
  return new Set(rows.map((x: any) => x.id));
}

/** O cliente é registro de teste? */
export async function isTestClient(exec: { execute: (q: any) => Promise<any> }, clientId: string | null | undefined): Promise<boolean> {
  if (!clientId) return false;
  return (await testRecordIds(exec, "clients", [clientId])).has(clientId);
}
