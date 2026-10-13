import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { is, SQL } from "drizzle-orm";
import { getTableConfig, PgTable, PgDialect } from "drizzle-orm/pg-core";
import * as baseline from "../src/lib/db/schema";
import * as review from "../src/lib/db/admin-review-schema";
import * as commerce from "../src/lib/db/admin-commerce-schema";
import * as content from "../src/lib/db/content-schema";
import * as files from "../src/lib/db/resource-schema";
import * as discovery from "../src/lib/db/discovery-schema";
import * as pricing from "../src/lib/db/pricing-schema";
import * as affiliate from "../src/lib/db/affiliate-creator-schema";
import type postgres from "postgres";
function conjunctions(expression: string): string[] {
  expression = expression.trim();
  // Peel only parentheses enclosing the entire expression (quoted literal
  // tokens do not affect nesting); OR/NOT branches are never decomposed.
  while (expression.startsWith("(") && expression.endsWith(")")) {
    const scan = expression.match(/'(?:''|[^'])*'|"(?:""|[^"])*"|\s+|./g)!;
    let depth = 0,
      encloses = true;
    for (let i = 0; i < scan.length; i++) {
      if (scan[i] === "(") depth++;
      if (scan[i] === ")") depth--;
      if (depth === 0 && i < scan.length - 1) {
        encloses = false;
        break;
      }
    }
    if (!encloses) break;
    expression = expression.slice(1, -1).trim();
  }
  // SQL-token-aware top-level conjunctions; BETWEEN owns its first AND.
  const tokens = expression.match(
    /'(?:''|[^'])*'|"(?:""|[^"])*"|[A-Za-z_][A-Za-z_0-9]*|\s+|./g,
  )!;
  let depth = 0,
    between = false,
    part = "";
  const result: string[] = [];
  for (const token of tokens) {
    if (token === "(") depth++;
    if (token === ")") depth--;
    if (depth === 0 && token.toUpperCase() === "BETWEEN") between = true;
    if (depth === 0 && token.toUpperCase() === "AND") {
      if (between) between = false;
      else {
        result.push(part.trim());
        part = "";
        continue;
      }
    }
    part += token;
  }
  result.push(part.trim());
  return result.length > 1
    ? result.flatMap((part) => conjunctions(part))
    : result;
}
export async function verifyIntegratedDatabase(
  operator: ReturnType<typeof postgres>,
) {
  const equivalentConstraintNames: {
    table: string;
    drizzleName: string;
    sqlName: string;
  }[] = [];
  const equivalentIndexNames: {
    table: string;
    drizzleName: string;
    sqlName: string;
  }[] = [];
  const extendedNonUniqueIndexes: {
    table: string;
    name: string;
    drizzleColumns: string[];
    sqlColumns: string[];
  }[] = [];
  const modules = [
    baseline,
    review,
    commerce,
    content,
    files,
    discovery,
    pricing,
    affiliate,
  ];
  const expected = modules.flatMap((m) =>
    Object.values(m)
      .filter((v) => is(v, PgTable))
      .map((t) => getTableConfig(t as PgTable)),
  );
  const names = [...new Set(expected.map((t) => t.name))].sort();
  const inventory = await operator.unsafe(
    "SELECT c.relname,c.relrowsecurity FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind='r' ORDER BY c.relname",
  );
  assert.deepEqual(
    inventory.map((r) => r.relname).filter((n) => n !== "TestUsers"),
    names,
  );
  assert(inventory.every((r) => r.relrowsecurity));
  for (const t of expected) {
    const columns =
      await operator`SELECT attname FROM pg_attribute WHERE attrelid=${"public." + t.name}::regclass AND attnum>0 AND NOT attisdropped`;
    for (const column of t.columns)
      assert(
        columns.some((c) => c.attname === column.name),
        `Missing ${t.name}.${column.name}`,
      );
    const fks =
      await operator`SELECT k.conname,array(SELECT attname FROM unnest(k.conkey) WITH ORDINALITY x(n,o) JOIN pg_attribute a ON a.attrelid=k.conrelid AND a.attnum=x.n ORDER BY x.o) AS columns,k.confrelid::regclass::text AS target,array(SELECT attname FROM unnest(k.confkey) WITH ORDINALITY x(n,o) JOIN pg_attribute a ON a.attrelid=k.confrelid AND a.attnum=x.n ORDER BY x.o) AS target_columns FROM pg_constraint k WHERE k.conrelid=${"public." + t.name}::regclass AND k.contype='f'`;
    for (const fk of t.foreignKeys) {
      const ref = fk.reference(),
        dest = getTableConfig(ref.foreignTable);
      assert(
        fks.some(
          (f) =>
            JSON.stringify(f.columns) ===
              JSON.stringify(ref.columns.map((c) => c.name)) &&
            f.target.replace(/^public\./, "") === dest.name &&
            JSON.stringify(f.target_columns) ===
              JSON.stringify(ref.foreignColumns.map((c) => c.name)),
        ),
        `Missing FK ${t.name} -> ${dest.name}`,
      );
    }
    const indexes =
      await operator`SELECT indexrelid::regclass::text AS name,indisvalid,indisunique,array(SELECT attname FROM unnest(indkey) WITH ORDINALITY x(n,o) JOIN pg_attribute a ON a.attrelid=indrelid AND a.attnum=x.n ORDER BY x.o) AS columns,pg_get_expr(indpred,indrelid) AS predicate,pg_get_expr(indexprs,indrelid) AS expressions FROM pg_index WHERE indrelid=${"public." + t.name}::regclass`;
    assert(
      indexes.every((i) => i.indisvalid),
      `Invalid index ${t.name}`,
    );
    await operator.unsafe(
      `CREATE TEMP TABLE aibean_index_probe (LIKE public.${t.name})`,
    );
    try {
      for (const index of t.indexes) {
        const config = index.config;
        assert(typeof config.name === "string");
        const columns = config.columns.flatMap((c) =>
          "name" in c && typeof c.name === "string" ? [c.name] : [],
        );
        const definitions = config.columns.map((c) => {
          if ("name" in c && typeof c.name === "string")
            return '"' + c.name + '"';
          assert(is(c, SQL), "Unknown expression index");
          const q = new PgDialect().sqlToQuery(c);
          assert.equal(q.params.length, 0);
          return "(" + q.sql.replaceAll(`"${t.name}".`, "") + ")";
        });
        const where = config.where
          ? new PgDialect().sqlToQuery(config.where)
          : null;
        if (where) assert.equal(where.params.length, 0);
        await operator.unsafe(
          `CREATE ${config.unique ? "UNIQUE " : ""}INDEX aibean_index_shape ON pg_temp.aibean_index_probe (${definitions.join(",")})${where ? " WHERE " + where.sql.replaceAll(`"${t.name}".`, "") : ""}`,
        );
        const [probe] = await operator.unsafe(
          "SELECT pg_get_expr(indpred,indrelid) AS predicate,pg_get_expr(indexprs,indrelid) AS expressions FROM pg_index WHERE indexrelid='pg_temp.aibean_index_shape'::regclass",
        );
        const match = indexes.find(
          (i) =>
            i.indisunique === Boolean(config.unique) &&
            JSON.stringify(
              config.unique ? i.columns : i.columns.slice(0, columns.length),
            ) === JSON.stringify(columns) &&
            i.predicate === probe.predicate &&
            i.expressions === probe.expressions,
        );
        assert(match, `Missing equivalent index ${index.config.name}`);
        if (match.columns.length !== columns.length)
          extendedNonUniqueIndexes.push({
            table: t.name,
            name: config.name,
            drizzleColumns: columns,
            sqlColumns: match.columns,
          });
        if (match.name !== config.name)
          equivalentIndexNames.push({
            table: t.name,
            drizzleName: config.name,
            sqlName: match.name,
          });
        await operator.unsafe("DROP INDEX pg_temp.aibean_index_shape");
      }
    } finally {
      await operator.unsafe("DROP TABLE pg_temp.aibean_index_probe");
    }
    const constraints =
      await operator`SELECT conname,contype,convalidated,pg_get_constraintdef(oid) AS definition,pg_get_expr(conbin,conrelid) AS expression FROM pg_constraint WHERE conrelid=${"public." + t.name}::regclass`;
    assert(
      constraints.every((c) => c.convalidated),
      `Unvalidated constraint ${t.name}`,
    );
    // Frozen hand-reviewed SQL may use PostgreSQL-generated check names while
    // Drizzle supplies explicit names. Compare PostgreSQL-normalized expressions
    // rather than assume names imply either equivalence or missing protection.
    await operator.unsafe(
      `CREATE TEMP TABLE aibean_check_probe (LIKE public.${t.name})`,
    );
    try {
      const effectiveChecks = [...constraints];
      for (const row of constraints.filter((c) => c.contype === "c")) {
        for (const predicate of conjunctions(row.expression)) {
          await operator.unsafe(
            `ALTER TABLE pg_temp.aibean_check_probe ADD CONSTRAINT aibean_atomic_check CHECK (${predicate})`,
          );
          const [probe] = await operator.unsafe(
            "SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='pg_temp.aibean_check_probe'::regclass AND conname='aibean_atomic_check'",
          );
          effectiveChecks.push({ ...row, definition: probe.definition });
          await operator.unsafe(
            "ALTER TABLE pg_temp.aibean_check_probe DROP CONSTRAINT aibean_atomic_check",
          );
        }
      }
      for (const c of t.checks) {
        const query = new PgDialect().sqlToQuery(c.value);
        assert.equal(
          query.params.length,
          0,
          "Unexpected bound check definition",
        );
        const expression = query.sql.replaceAll(`"${t.name}".`, "");
        const parts = conjunctions(expression);
        for (const [position, predicate] of [
          expression,
          ...(parts.length > 1 ? parts : []),
        ].entries()) {
          await operator.unsafe(
            `ALTER TABLE pg_temp.aibean_check_probe ADD CONSTRAINT "${c.name}" CHECK (${predicate})`,
          );
          const [probe] =
            await operator`SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='pg_temp.aibean_check_probe'::regclass AND conname=${c.name}`;
          const match = effectiveChecks.find(
            (row) => row.definition === probe.definition,
          );
          if ((!match && position > 0) || (!match && parts.length === 1))
            assert.fail(`Missing equivalent check ${t.name}/${c.name}`);
          if (match && match.conname !== c.name)
            equivalentConstraintNames.push({
              table: t.name,
              drizzleName: c.name,
              sqlName: match.conname,
            });
          await operator.unsafe(
            `ALTER TABLE pg_temp.aibean_check_probe DROP CONSTRAINT "${c.name}"`,
          );
          if (match && position === 0) break;
        }
      }
    } finally {
      await operator.unsafe("DROP TABLE pg_temp.aibean_check_probe");
    }
    for (const role of ["anon", "authenticated", "service_role"]) {
      const [grants] =
        await operator`SELECT has_table_privilege(${role},${"public." + t.name},'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(${role},${"public." + t.name},'SELECT,INSERT,UPDATE,REFERENCES') AS exposed`;
      assert.equal(
        grants.exposed,
        false,
        `Unexpected effective grants ${role}/${t.name}`,
      );
    }
  }
  const m = JSON.parse(
    readFileSync("db/proposals/auth-release-v1/manifest.json", "utf8"),
  );
  for (const d of m.dependencies) {
    assert.equal(
      createHash("sha256")
        .update(readFileSync(d.path, "utf8").replaceAll("\r\n", "\n"))
        .digest("hex"),
      d.sha256,
    );
    const result = await operator.unsafe(
      `SELECT sql_sha256 FROM aibean_private.${d.ledger} WHERE package_id=$1`,
      [d.id],
    );
    assert.equal(result.length, 1);
    assert.equal(result[0].sql_sha256, d.sha256);
    const [ledger] = await operator.unsafe(
      `SELECT relrowsecurity FROM pg_class WHERE oid='aibean_private.${d.ledger}'::regclass`,
    );
    assert(ledger.relrowsecurity);
    for (const role of ["anon", "authenticated", "service_role"]) {
      const [grant] =
        await operator`SELECT has_table_privilege(${role},${"aibean_private." + d.ledger},'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(${role},${"aibean_private." + d.ledger},'SELECT,INSERT,UPDATE,REFERENCES') AS exposed`;
      assert.equal(grant.exposed, false);
    }
  }
  // Independently compare every named CREATE INDEX in the exact frozen SQL,
  // including sort order, extra tie-break columns and expression/partial indexes.
  let frozenIndexesVerified = 0;
  const frozenSources = [
    "db/install/reviewed-installation.sql",
    ...m.dependencies.map((d: { path: string }) => d.path),
  ];
  for (const path of frozenSources) {
    const source = readFileSync(path, "utf8");
    for (const match of source.matchAll(
      /CREATE\s+(UNIQUE\s+)?INDEX\s+("?\w+"?)\s+ON\s+(?:"?public"?\.)?("?\w+"?)\s*([\s\S]+?);/gi,
    )) {
      const name = match[2].replaceAll('"', ""),
        table = match[3].replaceAll('"', "");
      if (!names.includes(table)) continue;
      const [actual] =
        await operator`SELECT pg_get_indexdef(indexrelid) AS definition FROM pg_index WHERE indrelid=${"public." + table}::regclass AND indexrelid=${"public." + name}::regclass AND indisvalid`;
      assert(actual, `Missing frozen index ${name}`);
      await operator.unsafe(
        `CREATE TEMP TABLE aibean_frozen_probe (LIKE public.${table})`,
      );
      try {
        const tail = match[4]
          .replaceAll(`"${table}".`, "")
          .replaceAll(`public.${table}.`, "");
        await operator.unsafe(
          `CREATE ${match[1] || ""}INDEX aibean_frozen_index ON pg_temp.aibean_frozen_probe ${tail}`,
        );
        const [probe] = await operator.unsafe(
          "SELECT pg_get_indexdef('pg_temp.aibean_frozen_index'::regclass) AS definition",
        );
        const normalize = (definition: string) =>
          definition.replace(
            /CREATE (UNIQUE )?INDEX \S+ ON \S+ /,
            "CREATE $1INDEX ON ",
          );
        assert.equal(
          normalize(actual.definition),
          normalize(probe.definition),
          `Frozen index shape differs ${name}`,
        );
        frozenIndexesVerified++;
      } finally {
        await operator.unsafe("DROP TABLE pg_temp.aibean_frozen_probe");
      }
    }
  }
  const totals = await operator.unsafe(
    "SELECT contype,count(*)::int AS n FROM pg_constraint WHERE connamespace='public'::regnamespace GROUP BY contype ORDER BY contype",
  );
  const indexes = await operator.unsafe(
    "SELECT count(*)::int AS n FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid WHERE t.relnamespace='public'::regnamespace",
  );
  return {
    tables: names,
    tableCount: names.length,
    constraints: totals.map((r) => ({ type: r.contype, count: r.n })),
    indexes: indexes[0].n,
    checkedSchemaModules: 8,
    equivalentConstraintNames,
    equivalentIndexNames,
    extendedNonUniqueIndexes,
    effectiveBrowserAndServiceGrants: "DENIED",
    sevenLedgers: "MATCH",
    frozenIndexesVerified,
    sqlPackages: m.dependencies,
  };
}
