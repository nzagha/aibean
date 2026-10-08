import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./db";
// Durable atomic fixed windows work locally and on Supabase; no per-process security fallback.
export async function rateLimit(
  userId: string,
  action: string,
  limit = 60,
  seconds = 3600,
) {
  const bucket = Math.floor(Date.now() / 1000 / seconds);
  const key = `${action}:${userId}:${bucket}`;
  const rows = await db().execute(
    sql`INSERT INTO rate_limits (key,count,window_start) VALUES (${key},1,now()) ON CONFLICT (key) DO UPDATE SET count=rate_limits.count+1 RETURNING count`,
  );
  if (Number(rows[0].count) > limit)
    throw new Error("Too many requests. Please try again later.");
}
