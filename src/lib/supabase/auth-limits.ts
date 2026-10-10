import { createHash } from "node:crypto";

export function createAuthLimiter() {
  const entries = new Map<string, { count: number; expires: number }>();
  let global = { count: 0, expires: 0 };
  return (purpose: string, email: string, now = Date.now()) => {
    if (global.expires <= now)
      global = { count: 0, expires: now + 15 * 60_000 };
    if (global.count >= 100) return false;
    global.count++;
    for (const [key, entry] of entries)
      if (entry.expires <= now) entries.delete(key);
    const key = createHash("sha256")
      .update(`${purpose}:${email}`)
      .digest("hex");
    let entry = entries.get(key);
    if (!entry) {
      if (entries.size >= 1024) return false;
      entry = { count: 0, expires: now + 15 * 60_000 };
      entries.set(key, entry);
    }
    if (entry.count >= (purpose === "login" ? 10 : 3)) return false;
    entry.count++;
    return true;
  };
}
