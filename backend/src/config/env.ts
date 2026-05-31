import { z } from "zod";
import "dotenv/config";
 
const envSchema = z.object({
  NODE_ENV:   z.enum(["development","production","test"]).default("development"),
  PORT:       z.coerce.number().default(3000),
  HOST:       z.string().default("0.0.0.0"),
  API_PREFIX: z.string().default("/api/v1"),
  LOG_LEVEL:  z.enum(["fatal","error","warn","info","debug","trace"]).default("info"),
  SUPABASE_URL:              z.string().url(),
  SUPABASE_ANON_KEY:         z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  POSTGRES_URL: z.string().min(1),
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



