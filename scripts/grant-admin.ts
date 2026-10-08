import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";
const id = process.argv[2];
if (!id?.startsWith("user_") || !process.env.DATABASE_URL)
  throw new Error(
    "Usage: npm run admin:grant -- user_<verified Clerk user ID>",
  );
async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  try {
    await sql.begin(async (tx) => {
      await tx`INSERT INTO users (id,is_admin) VALUES (${id},true) ON CONFLICT (id) DO UPDATE SET is_admin=true`;
      await tx`INSERT INTO audit_logs(id,actor_id,action,entity_id,detail) VALUES (${crypto.randomUUID()},'local-operator','admin.granted',${id},'Explicit operator bootstrap')`;
    });
    console.log("Admin capability granted to the specified Clerk user ID.");
  } finally {
    await sql.end();
  }
}
main().catch(() => {
  console.error("Admin bootstrap failed.");
  process.exitCode = 1;
});
