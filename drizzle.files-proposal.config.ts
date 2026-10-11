import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./src/lib/db/resource-schema.ts",
  out: "./db/proposals/creator-files-v1",
  dialect: "postgresql",
});
