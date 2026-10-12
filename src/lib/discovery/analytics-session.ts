import "server-only";
import { cookies, headers } from "next/headers";
import { analyticsToken } from "./session-proof";
import type { AnalyticsSession } from "./analytics-contracts";
const cookie = "aibean_analytics";
export function analyticsEnabled() {
  return (
    process.env.AIBEAN_DISCOVERY_WORKFLOWS === "true" &&
    (process.env.AIBEAN_ANALYTICS_SECRET || "").length >= 32
  );
}
export async function analyticsSession(): Promise<
  AnalyticsSession | undefined
> {
  if (!analyticsEnabled() || (await headers()).get("dnt") === "1")
    return undefined;
  const jar = await cookies(),
    secret = process.env.AIBEAN_ANALYTICS_SECRET!,
    old = jar.get(cookie)?.value || "",
    now = Date.now();
  const token = analyticsToken(secret, old, now);
  if (token.renew)
    jar.set(cookie, token.value, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 1800,
    });
  const h = await headers();
  let source: AnalyticsSession["source"] = "direct";
  try {
    const ref = new URL(h.get("referer") || ""),
      host = h.get("host");
    if (ref.host === host) {
      const path = ref.pathname;
      source =
        path.startsWith("/compare") || path.startsWith("/account/comparisons")
          ? "comparison"
          : path.startsWith("/collections")
            ? "stack"
            : /^\/@[^/]+\/[^/]+$/.test(path)
              ? "resource"
              : /^\/@[^/]+$/.test(path)
                ? "creator"
                : path.startsWith("/events")
                  ? "event"
                  : path === "/tools" ||
                      path.startsWith("/categories") ||
                      path.startsWith("/industries") ||
                      path.startsWith("/use-cases")
                    ? "directory"
                    : "direct";
    }
  } catch {
    /* No raw referrer or external attribution is stored. */
  }
  return { hash: token.hash, source };
}
