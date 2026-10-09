import { sql } from "drizzle-orm";
import { users } from "./schema";

// INSERT(id) is the reviewed runtime grant. Drizzle's ordinary insert builder
// names every column, including capability defaults, requiring extra privileges.
export function ordinaryUserInsert(id: string) {
  return sql`INSERT INTO ${users} ("id") VALUES (${id}) ON CONFLICT ("id") DO NOTHING`;
}
