// Texto da Recepção Automática: nome para o {nome} e montagem da mensagem. Sem banco (testável isolado).

/** Primeiro nome a partir do nome do WhatsApp (pushName) ou do cadastro. Só letras (com acento), 2 a 20; inicial
 *  maiúscula quando veio tudo maiúsculo ou tudo minúsculo. Emoji, número, símbolo ou vazio → "" (sem nome). */
export function firstNameFrom(raw: unknown): string {
  const first = String(raw ?? "").normalize("NFC").trim().split(/\s+/)[0] ?? "";
  // Tira símbolos e emojis das pontas ("~Maria", "Maria🌸", "*Ana*").
  const word = first.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
  if (word.length < 2 || word.length > 20 || !/^\p{L}+(?:['’-]\p{L}+)*$/u.test(word)) return "";
  if (word === word.toUpperCase() || word === word.toLowerCase()) {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
  return word;
}

/** Formas do mesmo celular brasileiro, só dígitos: com e sem 55, com e sem o 9 (o WhatsApp às vezes manda sem). */
export function phoneVariants(raw: string): string[] {
  const d = String(raw ?? "").replace(/\D/g, "");
  const local = (d.length === 12 || d.length === 13) && d.startsWith("55") ? d.slice(2) : d;
  if (local.length !== 10 && local.length !== 11) return d ? [d] : [];
  const locals = [local];
  if (local.length === 10) locals.push(local.slice(0, 2) + "9" + local.slice(2));
  if (local.length === 11 && local[2] === "9") locals.push(local.slice(0, 2) + local.slice(3));
  return locals.flatMap((l) => [l, "55" + l]);
}

/** Troca {nome} e {link}. Sem nome, o {nome} sai sem deixar buraco: "Oi, {nome}! Seja" → "Oi! Seja";
 *  "Oi {nome}, tudo bem?" → "Oi, tudo bem?". */
export function fillAutoReply(template: string, name: string, link: string): string {
  const withName = name
    ? template.replace(/\{nome\}/g, name)
    : template.replace(/,?[ \t]*\{nome\}/g, "").replace(/^[\s,!.]+/, "");
  return withName.replace(/\{link\}/g, link);
}

/** Mensagens padrão para contato novo (com o nome do WhatsApp). Ver NEW_CONTACT_OLD_DEFAULTS. */
export const NEW_CONTACT_DEFAULTS = [
  "Olá, {nome}! Que bom que você chegou até aqui. Conheça nossos horários disponíveis: {link}",
  "Oi, {nome}! Obrigado por entrar em contato. Você pode ver nossos serviços e agendar direto por aqui: {link}",
  "Olá, {nome}! Seja bem-vindo(a). Pra conhecer nossos horários e agendar, acesse: {link}",
  "Oi, {nome}, tudo bem? Recebemos sua mensagem! Dá uma olhada nos nossos horários disponíveis: {link}",
  "Olá, {nome}! Ficamos felizes com seu contato. Você já pode agendar seu horário por aqui: {link}",
  "Oi, {nome}! Obrigado por chegar até a gente. Confira nossos serviços e horários: {link}",
  "Olá, {nome}! Prazer em te atender. Pra agendar seu primeiro horário, acesse: {link}",
  "Oi, {nome}, tudo certo? Deixei o link com nossos horários disponíveis pra você: {link}",
  "Olá, {nome}! Que bom ter você por aqui. Veja nossos horários e agende quando quiser: {link}",
  "Oi, {nome}! Seja bem-vindo(a) ao nosso salão. Agende seu horário por aqui: {link}",
];

/** Padrões antigos (sem {nome}), na mesma ordem: só mensagem IDÊNTICA a um destes é trocada pela nova
 *  (scripts/boas-vindas-com-nome.ts); texto editado pelo dono nunca é tocado. */
export const NEW_CONTACT_OLD_DEFAULTS = [
  "Olá! Que bom que você chegou até aqui. Conheça nossos horários disponíveis: {link}",
  "Oi! Obrigado por entrar em contato. Você pode ver nossos serviços e agendar direto por aqui: {link}",
  "Olá! Seja bem-vindo(a). Pra conhecer nossos horários e agendar, acesse: {link}",
  "Oi, tudo bem? Recebemos sua mensagem! Dá uma olhada nos nossos horários disponíveis: {link}",
  "Olá! Ficamos felizes com seu contato. Você já pode agendar seu horário por aqui: {link}",
  "Oi! Obrigado por chegar até a gente. Confira nossos serviços e horários: {link}",
  "Olá! Prazer em te atender. Pra agendar seu primeiro horário, acesse: {link}",
  "Oi, tudo certo? Deixei o link com nossos horários disponíveis pra você: {link}",
  "Olá! Que bom ter você por aqui. Veja nossos horários e agende quando quiser: {link}",
  "Oi! Seja bem-vindo(a) ao nosso salão. Agende seu horário por aqui: {link}",
];
