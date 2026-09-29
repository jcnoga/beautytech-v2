import { z } from "zod";
import "dotenv/config";
 
const envSchema = z.object({
  NODE_ENV:   z.enum(["development","production","test"]).default("development"),
  PORT:       z.coerce.number().default(3000),
  HOST:       z.string().default("0.0.0.0"),
  API_PREFIX: z.string().default("/api/v1"),
  LOG_LEVEL:  z.enum(["fatal","error","warn","info","debug","trace"]).default("info"),
  // GoTrue próprio (VPS). GOTRUE_URL é o endereço interno, sem /auth/v1: ex. http://zensalon-gotrue:9999
  GOTRUE_URL:         z.string().url().transform((v) => v.replace(/\/+$/, "")),
  GOTRUE_JWT_SECRET:  z.string().min(32),
  GOTRUE_SERVICE_KEY: z.string().min(1), // JWT com role service_role assinado com GOTRUE_JWT_SECRET
  POSTGRES_URL: z.string().min(1),
  // SSL na conexão do banco: "true" no Supabase (pooler), "false" no Postgres da VPS (rede interna)
  POSTGRES_SSL: z.enum(["true","false"]).default("true").transform((v) => v === "true"),
  // Proxy confiável (IP/CIDR, separados por vírgula) para req.ip e rate limit; vazio = nenhum
  TRUST_PROXY: z.string().default(""),
  // Jobs automáticos (lembretes, aniversários, reativação, fila do WhatsApp, desconexão de expirados,
  // avisos de vencimento). Desligados por padrão: só um ambiente por vez pode rodá-los, senão os clientes
  // recebem mensagens em dobro (os tenants guardam as credenciais reais da Evolution no banco).
  JOBS_ENABLED: z.enum(["true","false"]).default("false").transform((v) => v === "true"),
  // Trava do WhatsApp: com "false", nenhuma rota envia mensagem nem conecta/desconecta/apaga instância
  // (as credenciais reais de cada salão estão no banco). Só o ambiente que atende os clientes usa "true".
  WHATSAPP_SEND_ENABLED: z.enum(["true","false"]).default("false").transform((v) => v === "true"),
  // Uploads: volume compartilhado com o nginx do container web, publicado em PUBLIC_UPLOADS_URL
  UPLOADS_DIR:        z.string().default("./uploads"),
  PUBLIC_UPLOADS_URL: z.string().default("/uploads").transform((v) => v.replace(/\/+$/, "")),
  CORS_ORIGINS: z.string().default("http://localhost:5173")
    .transform((v) => v.split(",").map((s) => s.trim())),
  RATE_LIMIT_MAX:    z.coerce.number().default(200),
  RATE_LIMIT_WINDOW: z.string().default("1 minute"),
  WHATSAPP_API_URL:  z.string().url().optional(),
  WHATSAPP_API_KEY:  z.string().optional(),
  WHATSAPP_INSTANCE: z.string().optional(),
  RESEND_API_KEY:    z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  RESEND_FROM_NAME:  z.string().optional(),
});
 
function parseEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("\nâŒ VariÃ¡veis de ambiente invÃ¡lidas:\n");
    result.error.errors.forEach((e) => {
      console.error(`  â€¢ ${e.path.join(".")}: ${e.message}`);
    });
    process.exit(1);
  }
  return result.data;
}
 
export const env = parseEnv();
export type Env = typeof env;

// Remetente único dos e-mails (Resend). O domínio precisa estar verificado na conta do Resend da RESEND_API_KEY.
export const EMAIL_FROM = `${env.RESEND_FROM_NAME ?? "ZenSalon"} <${env.RESEND_FROM_EMAIL ?? "noreply@99labpro.com.br"}>`;



