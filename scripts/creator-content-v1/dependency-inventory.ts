// Offline transitive local import closure; no environment loading or connections.
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve, relative, isAbsolute } from "node:path";
export function localDependencies(entries: string[]) {
  const found = new Set<string>();
  function visit(path: string) {
    const name = relative(process.cwd(), resolve(path)).replaceAll("\\", "/");
    assert(name && !name.startsWith("..") && !isAbsolute(name));
    if (found.has(name)) return;
    found.add(name);
    if (!/\.[cm]?[jt]sx?$/.test(name)) return;
    const text = readFileSync(name, "utf8");
    for (const match of text.matchAll(
      /(?:from\s*|import\s*\(\s*|import\s*)["'](\.[^"']+)["']/g,
    )) {
      const base = resolve(dirname(name), match[1]);
      const next = [
        base,
        base + ".ts",
        base + ".tsx",
        resolve(base, "index.ts"),
      ].find((p) => existsSync(p) && /(?:\.[cm]?[jt]sx?|\.json)$/.test(p));
      assert(next, "Unresolved local import");
      visit(next);
    }
  }
  entries.forEach(visit);
  return [...found].sort();
}
