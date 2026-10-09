// Resposta do 429 do @fastify/rate-limit em português (o padrão é "Rate limit exceeded, retry in 1 minute").
// O objeto é lançado e serializado pelo tratador de erro do Fastify (statusCode, code, error, message).
export function rateLimitErrorResponse() {
  const msg = "Muitas tentativas. Aguarde um minuto e tente de novo.";
  return { statusCode: 429, code: "TOO_MANY_ATTEMPTS", error: msg, message: msg };
}
