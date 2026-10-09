import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { verifiedDatabaseConfig } from "./src/lib/db/tls-config";
config({ path: ".env.local", quiet: true });
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  // Schema generation needs no credentials. Connecting commands fail closed
  // if credentials/CA are missing instead of falling back to insecure TLS.
  ...(process.env.DATABASE_URL
    ? { dbCredentials: verifiedDatabaseConfig().kitCredentials }
    : {}),
});
