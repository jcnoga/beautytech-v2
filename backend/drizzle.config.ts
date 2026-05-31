import { defineConfig } from "drizzle-kit";
import "dotenv/config";
 
export default defineConfig({
  schema:  "./src/db/schema/index.ts",
  out:     "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // SEMPRE Session Pooler IPv4 â€” nunca Direct Connection
    url: process.env["DB_URL"]!,
  },
  verbose: true,
  strict:  false,
});

