import { sql } from "drizzle-orm";
import type { IdentityDatabase } from "../supabase/identity";
import { resultRows } from "../admin/tool-workflows";
import { visibleTarget } from "./targets";
export async function readResourceCampaignLinks(
  database: IdentityDatabase,
  id: string,
) {
  return database.transaction(async (tx) => {
    if (!(await visibleTarget(tx, "resources", id))) return [];
    const [r] = resultRows<{
      skill_id: string | null;
      playbook_id: string | null;
    }>(
      await tx.execute(
        sql`SELECT skill_id,playbook_id FROM public.creator_resources WHERE id=${id}`,
      ),
    );
    const links = [];
    for (const [kind, key] of [
      ["skills", r.skill_id],
      ["playbooks", r.playbook_id],
    ] as const) {
      if (!key) continue;
      const target = await visibleTarget(tx, kind, key);
      if (target)
        links.push({
          ...target,
          href: target.href + "?campaign=" + encodeURIComponent(id),
        });
    }
    return links;
  });
}
