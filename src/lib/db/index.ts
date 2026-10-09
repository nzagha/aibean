import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { verifiedDatabaseConfig } from "./tls-config";
const globalDb = globalThis as unknown as {
  aibeanDb?: ReturnType<typeof createDb>;
};
function createDb() {
  const connection = verifiedDatabaseConfig();
  return drizzle(
    postgres(connection.connectionString, { ...connection.options, max: 5 }),
    { schema },
  );
}
export function db() {
  return (globalDb.aibeanDb ??= createDb());
}
