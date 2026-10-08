import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
const globalDb = globalThis as unknown as {
  aibeanDb?: ReturnType<typeof createDb>;
};
function createDb() {
  if (!process.env.DATABASE_URL) throw new Error("Database setup required.");
  return drizzle(
    postgres(process.env.DATABASE_URL, { prepare: false, max: 5 }),
    { schema },
  );
}
export function db() {
  return (globalDb.aibeanDb ??= createDb());
}
