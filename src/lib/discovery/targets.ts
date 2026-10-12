import { sql } from "drizzle-orm";
import { z } from "zod";
import type { IdentityTransaction } from "../supabase/identity";
import { resultRows } from "../admin/tool-workflows";
import { publicAuthor } from "../content/queries";
import { contentTables } from "../content/contracts";
import { taxonomy } from "../catalog/taxonomy";
export const followKinds = [
  "tools",
  "skills",
  "playbooks",
  "creators",
  "events",
  "industries",
] as const;
export const followKind = z.enum(followKinds);
export type FollowKind = (typeof followKinds)[number];
export type Target = {
  id: string;
  title: string;
  href: string;
  owner?: string;
  category?: string;
  industries?: string[];
};
export async function visibleTarget(
  tx: IdentityTransaction,
  kind: FollowKind | "resources",
  id: string,
): Promise<Target | undefined> {
  if (kind === "industries") {
    const approved = taxonomy.industries.find((t) => t.id === id);
    if (!approved) return undefined;
    const [t] = resultRows(
      await tx.execute(
        sql`SELECT id FROM public.taxonomy WHERE id=${id} AND kind='industry' FOR SHARE`,
      ),
    );
    return t
      ? { id, title: approved.name, href: "/industries/" + approved.slug }
      : undefined;
  }
  if (kind === "tools") {
    const [t] = resultRows<{
      id: string;
      name: string;
      slug: string;
      category_id: string;
      data: { industries?: { id: string }[] };
    }>(
      await tx.execute(
        sql`SELECT id,name,slug,category_id,data FROM public.tools WHERE id=${id} AND status='published' FOR SHARE`,
      ),
    );
    return t
      ? {
          id,
          title: t.name,
          href: "/tools/" + t.slug,
          category: t.category_id,
          industries: t.data.industries?.map((i) => i.id) || [],
        }
      : undefined;
  }
  if (kind === "creators") {
    const [t] = resultRows<{ display_name: string; handle: string }>(
      await tx.execute(
        sql`SELECT p.display_name,p.handle FROM public.account_profiles p JOIN public.users u ON u.id=p.user_id WHERE p.user_id=${id} AND p.status='published' AND ${publicAuthor("skills")} FOR SHARE OF p`,
      ),
    );
    return t
      ? { id, title: t.display_name, href: "/@" + t.handle, owner: id }
      : undefined;
  }
  const [t] = resultRows<{
    title: string;
    slug: string;
    user_id: string;
    category_id: string;
    industry_ids: string[];
  }>(
    await tx.execute(
      sql`SELECT r.title,r.slug,r.user_id,r.category_id,r.industry_ids FROM public.${sql.identifier(contentTables[kind])} r JOIN public.users u ON u.id=r.user_id WHERE r.id=${id} AND r.status='published' AND ${publicAuthor(kind)} FOR SHARE OF r`,
    ),
  );
  if (!t) return undefined;
  const creator =
    kind === "resources"
      ? await visibleTarget(tx, "creators", t.user_id)
      : undefined;
  if (kind === "resources" && !creator) return undefined;
  return {
    id,
    title: t.title,
    href:
      kind === "resources"
        ? creator!.href + "/" + t.slug
        : "/" + kind + "/" + t.slug,
    owner: t.user_id,
    category: t.category_id,
    industries: t.industry_ids,
  };
}
