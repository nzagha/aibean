import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { runtimeDatabaseConfig } from "./runtime-config";
const globalDb = globalThis as unknown as {
  aibeanDb?: ReturnType<typeof createDb>;
};
function createDb() {
  const connection = runtimeDatabaseConfig();
  return drizzle(
    postgres(connection.connectionString, { ...connection.options, max: 5 }),
    { schema },
  );
}
export function db() {
  return (globalDb.aibeanDb ??= createDb());
}
