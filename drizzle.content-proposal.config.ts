import { defineConfig } from "drizzle-kit";
// Pure generation only: no .env.local, credentials or automatic connection.
export default defineConfig({
  schema: "./src/lib/db/content-schema.ts",
  out: "./db/proposals/creator-content-v1",
  dialect: "postgresql",
});
