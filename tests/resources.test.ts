import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import review from "../db/proposals/admin-review-v1.manifest.json";
import commerce from "../db/proposals/admin-operations-v2/manifest.json";
import content from "../db/proposals/creator-content-v1/manifest.json";
import files from "../db/proposals/creator-files-v1/manifest.json";
import { setupAdminFixtures } from "./fixtures/admin-workflow-contract";
import { resourceWorkflowContract } from "./fixtures/resource-workflow-contract";
import { inspectFileStorage } from "../src/lib/resources/storage";
import {
  validateResource,
  MAX_RESOURCE_BYTES,
} from "../src/lib/resources/contracts";
import { loopbackResourceScanner } from "../src/lib/resources/clamav";
import { createServer } from "node:net";
test("Resource validators reject unsafe filenames, MIME/signature mismatches, scripts, malformed text and excessive size", () => {
  const good = {
    name: "notes.txt",
    mime: "text/plain",
    bytes: new TextEncoder().encode("A synthetic safe resource."),
  };
  assert.match(
    validateResource(good).objectKey,
    /^resources\/[a-f0-9-]+\/[a-f0-9-]+\.txt$/,
  );
  for (const change of [
    { name: "../notes.txt" },
    { name: "notes.svg" },
    { name: "notes.exe" },
    { mime: "text/html" },
    { bytes: new Uint8Array() },
    { bytes: new Uint8Array(MAX_RESOURCE_BYTES + 1) },
    { bytes: new TextEncoder().encode('<svg onload="malicious()"/>') },
    { bytes: new Uint8Array([0, 255]) },
    { name: "notes.pdf", mime: "application/pdf" },
  ])
    assert.throws(() => validateResource({ ...good, ...change }));
  const pdf = {
    name: "notes.pdf",
    mime: "application/pdf",
    bytes: new TextEncoder().encode("%PDF-1.7\nsynthetic\n%%EOF"),
  };
  assert.equal(validateResource(pdf).mime, "application/pdf");
});
test("File reservation, scanned upload, Admin review and short-lived download enforce ownership, private parents and failure compensation", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(
      "CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY)",
    );
    await pg.exec(
      await readFile("db/install/reviewed-installation.sql", "utf8"),
    );
    const db = drizzle(pg);
    await setupAdminFixtures(db);
    await pg.exec(
      "INSERT INTO public.users(id,is_creator) VALUES('content-other',true)",
    );
    for (const [m, setting] of [
      [review, "aibean.review_install_sha256"],
      [commerce, "aibean.operations_install_sha256"],
      [content, "aibean.content_install_sha256"],
      [files, "aibean.files_install_sha256"],
    ] as const) {
      const bytes = await readFile(m.sqlPath);
      assert.equal(
        createHash("sha256").update(bytes).digest("hex"),
        m.sqlSha256,
      );
      await pg.query("SELECT set_config($1,$2,false)", [setting, m.sqlSha256]);
      if (m === files) {
        await assert.rejects(
          pg.exec(
            bytes
              .toString("utf8")
              .replace(/\nCOMMIT;\s*$/, "\nSELECT 1/0;\nCOMMIT;\n"),
          ),
        );
        await pg.exec("ROLLBACK");
        assert.equal(
          (
            await pg.query<{ name: string | null }>(
              "SELECT to_regclass('public.resource_files')::text AS name",
            )
          ).rows[0].name,
          null,
        );
      }
      await pg.exec(bytes.toString("utf8"));
    }
    await pg.exec("SET ROLE aibean_runtime");
    assert.equal(await inspectFileStorage(db), true);
    await resourceWorkflowContract(db);
    await pg.exec(
      "RESET ROLE;GRANT SELECT(filename) ON public.resource_files TO authenticated;SET ROLE aibean_runtime",
    );
    assert.equal(await inspectFileStorage(db), false);
  } finally {
    await pg.close();
  }
});
test("Exact loopback scanner framing recognizes clean/infected and fails closed on errors without sending filenames", async () => {
  for (const response of [
    "stream: OK\0",
    "stream: Synthetic FOUND\0",
    "stream: scan ERROR\0",
  ]) {
    let captured = Buffer.alloc(0);
    const server = createServer((socket) => {
      socket.on("data", (chunk) => {
        captured = Buffer.concat([captured, chunk]);
        if (captured.length >= 10 + 4 + 5 + 4) socket.end(response);
      });
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const scanner = loopbackResourceScanner(address.port);
    try {
      if (response.includes("ERROR"))
        await assert.rejects(scanner.scan(new TextEncoder().encode("Hello")));
      else
        assert.equal(
          await scanner.scan(new TextEncoder().encode("Hello")),
          response.includes("OK") ? "clean" : "infected",
        );
      assert.equal(captured.subarray(0, 10).toString(), "zINSTREAM\0");
      assert.equal(captured.readUInt32BE(10), 5);
      assert.equal(captured.subarray(14, 19).toString(), "Hello");
      assert.equal(captured.readUInt32BE(19), 0);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    }
  }
  assert.throws(() => loopbackResourceScanner(443));
});
