import { sql } from "drizzle-orm";
import type { IdentityDatabase } from "../supabase/identity";
import { resultRows, checkAdmin } from "../admin/tool-workflows";
import { requireContentStorage } from "./storage";
import { checkAuthor } from "./workflows";
import type { ContentKind } from "./contracts";
export async function referenceOptions(
  database: IdentityDatabase,
  actor: string,
  kind: ContentKind,
  admin = false,
) {
  return database.transaction(async (tx) => {
    await requireContentStorage(tx);
    if (admin) await checkAdmin(tx, actor);
    else await checkAuthor(tx, actor, kind);
    const tools = resultRows<{ id: string; name: string }>(
      await tx.execute(
        sql`SELECT id,name FROM public.tools WHERE status='published' AND coalesce((data->>'demo')::boolean,false)=false ORDER BY name,id LIMIT 500`,
      ),
    );
    const skills = resultRows<{ id: string; title: string }>(
      await tx.execute(
        sql`SELECT id,title FROM public.ai_skills WHERE status='published' OR user_id=${actor} ORDER BY title,id LIMIT 500`,
      ),
    );
    const playbooks = resultRows<{ id: string; title: string }>(
      await tx.execute(
        sql`SELECT id,title FROM public.ai_playbooks WHERE status='published' OR user_id=${actor} ORDER BY title,id LIMIT 500`,
      ),
    );
    return { tools, skills, playbooks };
  });
}
