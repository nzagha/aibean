import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("migration enforces ownership, one review per user/tool, valid ratings, and billing deduplication", async () => {
  const db = new PGlite();
  try {
    const files = (await fs.readdir("db/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const file of files)
      await db.exec(await fs.readFile(`db/migrations/${file}`, "utf8"));
    await db.exec(
      `INSERT INTO taxonomy(id,kind,name,slug,data) VALUES ('CAT-01','category','Test','test','{}'); INSERT INTO users(id) VALUES ('user_a'),('user_b'); INSERT INTO tools(id,slug,name,category_id,data) VALUES ('t1','tool','Tool','CAT-01','{}');`,
    );
    await db.exec(
      `INSERT INTO vendor_access(tool_id,user_id) VALUES ('t1','user_a')`,
    );
    await assert.rejects(
      db.exec(
        `INSERT INTO vendor_access(tool_id,user_id) VALUES ('t1','user_b')`,
      ),
    );
    await db.exec(
      `INSERT INTO tool_reviews(id,user_id,tool_id,rating,body) VALUES ('r1','user_a','t1',4,'test')`,
    );
    await assert.rejects(
      db.exec(
        `INSERT INTO tool_reviews(id,user_id,tool_id,rating,body) VALUES ('r2','user_a','t1',3,'duplicate')`,
      ),
    );
    await assert.rejects(
      db.exec(
        `INSERT INTO tool_reviews(id,user_id,tool_id,rating,body) VALUES ('r3','user_b','t1',7,'out of range')`,
      ),
    );
    await assert.rejects(
      db.exec(
        `INSERT INTO saved_tools(user_id,tool_id) VALUES ('user_a','missing')`,
      ),
    );
    await db.exec(`INSERT INTO billing_webhook_receipts(id) VALUES ('evt_1')`);
    await assert.rejects(
      db.exec(`INSERT INTO billing_webhook_receipts(id) VALUES ('evt_1')`),
    );
    await db.exec(
      `BEGIN; INSERT INTO saved_tools(user_id,tool_id) VALUES ('user_a','t1'); ROLLBACK;`,
    );
    assert.equal((await db.query("SELECT * FROM saved_tools")).rows.length, 0);
    await db.exec(
      `INSERT INTO featured_placements(id,user_id,tool_id,sponsor_name,note) VALUES ('f1','user_a','t1','Test sponsor','Placement test');`,
    );
    await assert.rejects(
      db.exec(`UPDATE featured_placements SET status='active' WHERE id='f1'`),
    );
    await assert.rejects(
      db.exec(`UPDATE featured_placements SET amount=-99 WHERE id='f1'`),
    );
    await db.exec(
      `UPDATE featured_placements SET status='active',amount=9900,currency='usd',duration_days=5,stripe_session_id='cs_featured_test',paid_at=now(),starts_at=now(),ends_at=now()+interval '5 days' WHERE id='f1'`,
    );
    await assert.rejects(
      db.exec(
        `INSERT INTO featured_placements(id,user_id,tool_id,sponsor_name,note,stripe_session_id) VALUES ('f2','user_b','t1','Another sponsor','Duplicate checkout','cs_featured_test')`,
      ),
    );
  } finally {
    await db.close();
  }
});
