import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { taxonomyRecords, tools } from "../src/lib/db/schema";
import taxonomy from "../src/data/taxonomy.json";
import { demoTools } from "../src/data/demo-tools";
async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error("Set DATABASE_URL in .env.local");
  const client = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(client);
  try {
    await db.transaction(async (tx) => {
      for (const [kind, rows] of Object.entries({
        category: taxonomy.categories,
        industry: taxonomy.industries,
        use_case: taxonomy.useCases,
        listing_type: taxonomy.listingTypes,
      })) {
        for (const row of rows)
          await tx
            .insert(taxonomyRecords)
            .values({
              id: row.id,
              kind,
              name: row.name,
              slug: "slug" in row ? row.slug : row.id,
              data: row,
            })
            .onConflictDoNothing();
      }
      for (const category of taxonomy.categories) {
        for (const row of category.subcategories)
          await tx
            .insert(taxonomyRecords)
            .values({
              ...row,
              kind: "subcategory",
              parentId: category.id,
              data: row,
            })
            .onConflictDoNothing();
      }
      if (process.env.AIBEAN_DEMO_MODE === "true")
        for (const tool of demoTools)
          await tx
            .insert(tools)
            .values({
              id: tool.id,
              slug: tool.slug,
              name: tool.name,
              categoryId: tool.categoryId,
              status: "published",
              data: tool,
            })
            .onConflictDoNothing();
    });
    console.log(
      "Taxonomy seeded; existing records preserved. Demo tools seeded only when explicitly enabled.",
    );
  } finally {
    await client.end();
  }
}
main().catch(() => {
  console.error("Seed failed. Check database connectivity and migrations.");
  process.exitCode = 1;
});
