import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import type {
  IdentityDatabase,
  IdentityTransaction,
} from "../supabase/identity";
import type { AnalyticsSession } from "../discovery/analytics-contracts";
import { audit, checkAdmin, resultRows } from "../admin/tool-workflows";
import { AdminWorkflowError, recordId, reasonInput } from "../admin/contracts";
import { checkAuthor } from "../content/workflows";
import { visibleTarget } from "../discovery/targets";
import { enhancementsAvailable, requireEnhancements, history } from "./storage";
import {
  affiliateProgramInput,
  destinationInput,
  relationshipInput,
  changeKey,
  digest,
  publicHttps,
  receiptInput,
} from "./contracts";
type Row = Record<string, unknown> & { id: string; revision: number };
function fail(message: string): never {
  throw new AdminWorkflowError(message);
}
async function config(tx: IdentityTransaction, id: string) {
  const [p] = resultRows<Row>(
    await tx.execute(
      sql`SELECT id,partner,name,hosts,proposed_rate_bps,starts_at::text,ends_at::text FROM public.affiliate_programs WHERE id=${id}`,
    ),
  );
  if (!p) fail("Unknown program.");
  const destinations = resultRows(
    await tx.execute(
      sql`SELECT id,label,url,parameters,disclosure,enabled FROM public.affiliate_destinations WHERE program_id=${id} ORDER BY id`,
    ),
  );
  const relationships = resultRows(
    await tx.execute(
      sql`SELECT r.id,r.destination_id,r.tool_id,r.campaign_id,r.creator_share_bps,r.enabled FROM public.affiliate_relationships r JOIN public.affiliate_destinations d ON d.id=r.destination_id WHERE d.program_id=${id} ORDER BY r.id`,
    ),
  );
  return { program: p, destinations, relationships };
}
async function invalidate(
  tx: IdentityTransaction,
  actor: string,
  id: string,
  reason: string,
) {
  const snapshot = await config(tx, id),
    hash = digest(snapshot);
  const [p] = resultRows<Row>(
    await tx.execute(
      sql`UPDATE public.affiliate_programs SET status='disabled',config_sha256=${hash},revision=revision+1,updated_by=${actor},updated_at=clock_timestamp() WHERE id=${id} RETURNING id,revision`,
    ),
  );
  await history(tx, actor, "affiliate", id, String(p.revision), snapshot);
  await audit(tx, actor, "affiliate.configured", id, {
    reason,
    revision: p.revision,
    sha256: hash,
    status: "disabled",
  });
}
async function lock(tx: IdentityTransaction) {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended('affiliate-config',0))`,
  );
}
export async function saveAffiliate(
  database: IdentityDatabase,
  actor: string,
  kind: "program" | "destination" | "relationship",
  value: unknown,
  key?: { id: string; revision: number },
  reason = "",
) {
  reasonInput.parse(reason);
  const id = key?.id || randomUUID();
  if (key) changeKey.parse({ ...key, reason });
  const data =
    kind === "program"
      ? affiliateProgramInput.parse(value)
      : kind === "destination"
        ? destinationInput.parse(value)
        : relationshipInput.parse(value);
  return database.transaction(async (tx) => {
    await checkAdmin(tx, actor);
    await requireEnhancements(tx);
    await lock(tx);
    const table =
      kind === "program"
        ? "affiliate_programs"
        : kind === "destination"
          ? "affiliate_destinations"
          : "affiliate_relationships";
    let old: Row | undefined;
    if (key) {
      [old] = resultRows<Row>(
        await tx.execute(
          sql`SELECT * FROM public.${sql.identifier(table)} WHERE id=${id} FOR UPDATE`,
        ),
      );
      if (!old || old.revision !== key.revision)
        fail("Affiliate configuration changed. Refresh before editing.");
    }
    let program = id;
    if (kind === "program") {
      const v = affiliateProgramInput.parse(data);
      // Removing a host must not retain an incompatible destination.
      const destinations = resultRows<{ url: string }>(
        await tx.execute(
          sql`SELECT url FROM public.affiliate_destinations WHERE program_id=${id}`,
        ),
      );
      if (destinations.some((d) => !v.hosts.includes(new URL(d.url).hostname)))
        fail(
          "Existing destinations require those hosts. Replace the destination first.",
        );
      await tx.execute(
        sql`INSERT INTO public.affiliate_programs(id,partner,name,hosts,proposed_rate_bps,starts_at,ends_at,config_sha256,updated_by) VALUES(${id},${v.partner},${v.name},${JSON.stringify(v.hosts)}::jsonb,${v.proposedRateBps},${v.startsAt}::timestamptz,${v.endsAt}::timestamptz,${digest(v)},${actor}) ON CONFLICT(id) DO UPDATE SET partner=excluded.partner,name=excluded.name,hosts=excluded.hosts,proposed_rate_bps=excluded.proposed_rate_bps,starts_at=excluded.starts_at,ends_at=excluded.ends_at`,
      );
    } else if (kind === "destination") {
      const v = destinationInput.parse(data);
      program = v.programId;
      if (old && old.program_id !== program)
        fail("A destination cannot be reassigned to another program.");
      const [p] = resultRows<{ hosts: string[] }>(
        await tx.execute(
          sql`SELECT hosts FROM public.affiliate_programs WHERE id=${program}`,
        ),
      );
      if (!p || !p.hosts.includes(new URL(v.url).hostname))
        fail("The exact destination host must be permitted by its program.");
      await tx.execute(
        sql`INSERT INTO public.affiliate_destinations(id,program_id,label,url,parameters,disclosure,enabled,updated_by) VALUES(${id},${program},${v.label},${v.url},${JSON.stringify(v.parameters)}::jsonb,${v.disclosure},${v.enabled},${actor}) ON CONFLICT(id) DO UPDATE SET label=excluded.label,url=excluded.url,parameters=excluded.parameters,disclosure=excluded.disclosure,enabled=excluded.enabled,revision=affiliate_destinations.revision+1,updated_by=${actor},updated_at=clock_timestamp()`,
      );
    } else {
      const v = relationshipInput.parse(data);
      const [d] = resultRows<{ program_id: string }>(
        await tx.execute(
          sql`SELECT program_id FROM public.affiliate_destinations WHERE id=${v.destinationId}`,
        ),
      );
      if (!d) fail("Unknown destination.");
      program = d.program_id;
      if (old && old.destination_id !== v.destinationId)
        fail(
          "Create a new relationship instead of reassigning historical attribution.",
        );
      if (old && (old.tool_id !== v.toolId || old.campaign_id !== v.campaignId))
        fail("A historical relationship's Tool and campaign are immutable.");
      const tool = await visibleTarget(tx, "tools", v.toolId);
      if (!tool) fail("Use a published Tool.");
      const [real] = resultRows(
        await tx.execute(
          sql`SELECT id FROM public.tools WHERE id=${v.toolId} AND coalesce((data->>'demo')::boolean,false)=false`,
        ),
      );
      if (!real) fail("Demo Tools cannot have commercial relationships.");
      if (
        v.campaignId &&
        !(await campaignContains(tx, v.campaignId, "tools", v.toolId, true))
      )
        fail(
          "The owned campaign must reference this Tool and belong to an approved Creator.",
        );
      await tx.execute(
        sql`INSERT INTO public.affiliate_relationships(id,destination_id,tool_id,campaign_id,creator_share_bps,enabled,updated_by) VALUES(${id},${v.destinationId},${v.toolId},${v.campaignId},${v.creatorShareBps},${v.enabled},${actor}) ON CONFLICT(id) DO UPDATE SET creator_share_bps=excluded.creator_share_bps,enabled=excluded.enabled,revision=affiliate_relationships.revision+1,updated_by=${actor},updated_at=clock_timestamp()`,
      );
    }
    await invalidate(tx, actor, program, reason);
    return id;
  });
}
function approvals(): Record<string, string> {
  try {
    const p = JSON.parse(
      process.env.AIBEAN_AFFILIATE_APPROVED_PROGRAMS || "{}",
    );
    return p && typeof p === "object" ? p : {};
  } catch {
    return {};
  }
}
export async function setProgramStatus(
  database: IdentityDatabase,
  actor: string,
  value: unknown,
) {
  const input = changeKey
    .extend({ enabled: (await import("zod")).z.boolean() })
    .parse(value);
  return database.transaction(async (tx) => {
    await checkAdmin(tx, actor);
    await requireEnhancements(tx);
    await lock(tx);
    const [p] = resultRows<Row & { config_sha256: string }>(
      await tx.execute(
        sql`SELECT * FROM public.affiliate_programs WHERE id=${input.id} FOR UPDATE`,
      ),
    );
    if (!p || p.revision !== input.revision) fail("Stale program revision.");
    if (
      input.enabled &&
      (approvals()[p.id] !== p.config_sha256 ||
        process.env.AIBEAN_AFFILIATE_PROVIDER_VERIFIED !== "true")
    )
      fail(
        "Activation requires separate owner approval for the exact complete configuration and a verified provider contract.",
      );
    const snapshot = await config(tx, p.id);
    if (digest(snapshot) !== p.config_sha256)
      fail("Program integrity mismatch.");
    await tx.execute(
      sql`UPDATE public.affiliate_programs SET status=${input.enabled ? "enabled" : "disabled"},revision=revision+1,updated_by=${actor},updated_at=clock_timestamp() WHERE id=${p.id}`,
    );
    await history(tx, actor, "affiliate", p.id, String(p.revision + 1), {
      ...snapshot,
      status: input.enabled ? "enabled" : "disabled",
    });
    await audit(tx, actor, "affiliate.status", p.id, {
      reason: input.reason,
      enabled: input.enabled,
      sha256: p.config_sha256,
    });
  });
}
export async function campaignContains(
  tx: IdentityTransaction,
  campaign: string,
  kind: string,
  target: string,
  privateDraft = false,
) {
  const [r] = resultRows<{ user_id: string; status: string }>(
    await tx.execute(
      sql`SELECT user_id,status FROM public.creator_resources WHERE id=${campaign} FOR SHARE`,
    ),
  );
  if (!r) return false;
  if (privateDraft) {
    try {
      await checkAuthor(tx, r.user_id, "resources");
    } catch {
      return false;
    }
  } else if (!(await visibleTarget(tx, "resources", campaign))) return false;
  if (kind === "resources" && target === campaign) return true;
  const column = {
    tools: "tool_id",
    skills: "skill_id",
    playbooks: "playbook_id",
    events: "event_id",
    stacks: "stack_id",
    resources: "resource_id",
  }[kind];
  if (!column) return false;
  const [b] = resultRows(
    await tx.execute(
      sql`SELECT id FROM public.campaign_blocks WHERE campaign_id=${campaign} AND kind=${kind} AND ${sql.identifier(column)}=${target} LIMIT 1`,
    ),
  );
  return !!b;
}
export async function affiliateDisclosure(
  tx: IdentityTransaction,
  tool: string,
  campaign?: string,
) {
  if (!(await enhancementsAvailable(tx))) return undefined;
  if (campaign && !(await campaignContains(tx, campaign, "tools", tool)))
    fail("Unrelated or unavailable campaign context.");
  const [r] = resultRows<{
    id: string;
    url: string;
    parameters: Record<string, string>;
    disclosure: string;
    config_sha256: string;
    hosts: string[];
    program_id: string;
  }>(
    await tx.execute(
      sql`SELECT r.id,d.url,d.parameters,d.disclosure,p.config_sha256,p.hosts,p.id AS program_id FROM public.affiliate_relationships r JOIN public.affiliate_destinations d ON d.id=r.destination_id JOIN public.affiliate_programs p ON p.id=d.program_id WHERE r.tool_id=${tool} AND (r.campaign_id=${campaign || null} OR r.campaign_id IS NULL) AND r.enabled AND d.enabled AND p.status='enabled' AND now()>=p.starts_at AND now()<p.ends_at ORDER BY r.campaign_id NULLS LAST LIMIT 1`,
    ),
  );
  if (
    !r ||
    approvals()[r.program_id] !== r.config_sha256 ||
    process.env.AIBEAN_AFFILIATE_PROVIDER_VERIFIED !== "true"
  )
    return undefined;
  publicHttps.parse(r.url);
  if (digest(await config(tx, r.program_id)) !== r.config_sha256)
    fail("Program configuration integrity mismatch.");
  if (!r.hosts.includes(new URL(r.url).hostname))
    fail("Unapproved destination host.");
  return r;
}
export async function affiliateOutbound(
  tx: IdentityTransaction,
  tool: string,
  campaign: string | undefined,
  session: AnalyticsSession | undefined,
  disclosureHash?: string,
) {
  if (!(await enhancementsAvailable(tx))) return undefined;
  await lock(tx);
  const r = await affiliateDisclosure(tx, tool, campaign);
  if (
    !r ||
    disclosureHash !== r.config_sha256 ||
    !session ||
    !/^[a-f0-9]{64}$/.test(session.hash)
  )
    return undefined;
  const [clock] = resultRows<{ bucket: string }>(
    await tx.execute(
      sql`SELECT floor(extract(epoch FROM now())/60)::text AS bucket`,
    ),
  );
  for (const [key, max] of [
    ["affiliate-session:" + session.hash, 30],
    ["affiliate-tool:" + tool, 1000],
  ] as const) {
    const [b] = resultRows<{ count: number }>(
      await tx.execute(
        sql`INSERT INTO public.rate_limits(key,count,window_start) VALUES(${key + ":" + clock.bucket},1,now()) ON CONFLICT(key) DO UPDATE SET count=rate_limits.count+1 RETURNING count`,
      ),
    );
    if (b.count > max) fail("Affiliate click budget exceeded.");
  }
  const key = digest([
    session.hash,
    tool,
    campaign || null,
    r.id,
    clock.bucket,
  ]);
  let [click] = resultRows<{ id: string }>(
    await tx.execute(
      sql`INSERT INTO public.affiliate_clicks(id,relationship_id,tool_id,campaign_id,dedup_key,source,disclosure,program_sha256) VALUES(${randomUUID()},${r.id},${tool},${campaign || null},${key},${session.source},${r.disclosure},${r.config_sha256}) ON CONFLICT(dedup_key) DO NOTHING RETURNING id`,
    ),
  );
  const url = new URL(r.url);
  if (!click)
    [click] = resultRows<{ id: string }>(
      await tx.execute(
        sql`SELECT id FROM public.affiliate_clicks WHERE dedup_key=${key}`,
      ),
    );
  await tx.execute(
    sql`DELETE FROM public.rate_limits WHERE key IN (SELECT key FROM public.rate_limits WHERE (key LIKE 'affiliate-session:%' OR key LIKE 'affiliate-tool:%') AND window_start<now()-interval '1 day' ORDER BY window_start LIMIT 1000)`,
  );
  for (const [k, v] of Object.entries(r.parameters))
    url.searchParams.set(
      k,
      v === "{click}"
        ? click.id
        : v === "{tool}"
          ? tool
          : v === "{campaign}"
            ? campaign || "direct"
            : v,
    );
  return url.href;
}
export type ReceiptVerifier = {
  verify: (
    payload: string,
    signature: string,
    program: string,
  ) => Promise<boolean>;
};
export function hmacReceiptVerifier(): ReceiptVerifier {
  return {
    verify: async (payload, signature, program) => {
      let keys: Record<string, string>;
      try {
        keys = JSON.parse(process.env.AIBEAN_AFFILIATE_RECEIPT_KEYS || "{}");
      } catch {
        return false;
      }
      const key = keys[program];
      if (
        typeof key !== "string" ||
        key.length < 32 ||
        !/^[a-f0-9]{64}$/.test(signature)
      )
        return false;
      return timingSafeEqual(
        Buffer.from(
          createHmac("sha256", key).update(payload).digest("hex"),
          "hex",
        ),
        Buffer.from(signature, "hex"),
      );
    },
  };
}
export async function reconcileAffiliate(
  database: IdentityDatabase,
  actor: string,
  value: unknown,
  signature: string,
  verifier: ReceiptVerifier,
  reason: string,
) {
  reasonInput.parse(reason);
  const input = receiptInput.parse(value),
    payload = JSON.stringify(input);
  // Authorize before accessing the verifier, then recheck inside the write transaction.
  await database.transaction(async (tx) => {
    await checkAdmin(tx, actor);
    await requireEnhancements(tx);
  });
  if (
    process.env.AIBEAN_AFFILIATE_PROVIDER_VERIFIED !== "true" ||
    Date.parse(input.issuedAt) < Date.now() - 86400000 ||
    Date.parse(input.issuedAt) > Date.now() + 300000 ||
    !(await verifier.verify(payload, signature, input.programId))
  )
    fail("Receipt is stale or its provider evidence could not be verified.");
  return database.transaction(async (tx) => {
    await checkAdmin(tx, actor);
    await requireEnhancements(tx);
    await lock(tx);
    const [c] = resultRows(
      await tx.execute(
        sql`SELECT c.id FROM public.affiliate_clicks c JOIN public.affiliate_relationships r ON r.id=c.relationship_id JOIN public.affiliate_destinations d ON d.id=r.destination_id WHERE c.id=${input.clickId} AND d.program_id=${input.programId}`,
      ),
    );
    if (!c) fail("Receipt does not match a recorded program click.");
    const [old] = resultRows<{ evidence_sha256: string }>(
      await tx.execute(
        sql`SELECT evidence_sha256 FROM public.affiliate_reconciliations WHERE program_id=${input.programId} AND provider_event_id=${input.eventId}`,
      ),
    );
    if (old) {
      if (old.evidence_sha256 !== digest(input))
        fail("Conflicting provider event replay.");
      return;
    }
    const [previous] = resultRows<{ status: string }>(
      await tx.execute(
        sql`SELECT status FROM public.affiliate_reconciliations WHERE click_id=${input.clickId} ORDER BY created_at DESC,id DESC LIMIT 1`,
      ),
    );
    if (
      previous?.status === "reversed" ||
      previous?.status === input.status ||
      (input.status === "reversed" && !previous)
    )
      fail("Duplicate or invalid conversion transition.");
    await tx.execute(
      sql`INSERT INTO public.affiliate_reconciliations(id,program_id,provider_event_id,click_id,status,conversion_count,commission_cents,currency,evidence_sha256,updated_by) VALUES(${randomUUID()},${input.programId},${input.eventId},${input.clickId},${input.status},${input.conversionCount},${input.commissionCents},${input.currency},${digest(input)},${actor})`,
    );
    await audit(tx, actor, "affiliate.provider-reconciled", input.clickId, {
      reason,
      event: input.eventId,
      status: input.status,
      evidence: digest(input),
    });
  });
}
export async function readAffiliates(
  database: IdentityDatabase,
  actor: string,
  scope: "admin" | "creator" | "vendor",
  tool?: string,
) {
  return database.transaction(async (tx) => {
    if (scope === "admin") await checkAdmin(tx, actor);
    else if (scope === "creator") await checkAuthor(tx, actor, "resources");
    else {
      recordId.parse(tool);
      const [v] = resultRows(
        await tx.execute(
          sql`SELECT tool_id FROM public.vendor_access WHERE user_id=${actor} AND tool_id=${tool}`,
        ),
      );
      if (!v) fail("Tool-scoped Vendor ownership is required.");
    }
    if (!(await enhancementsAvailable(tx)))
      return {
        ready: false,
        programs: [] as Row[],
        destinations: [] as Row[],
        relationships: [] as Row[],
        clicks: [] as Row[],
        conversions: [] as Row[],
      };
    const where =
      scope === "admin"
        ? sql`true`
        : scope === "creator"
          ? sql`EXISTS(SELECT 1 FROM public.creator_resources cr WHERE cr.id=r.campaign_id AND cr.user_id=${actor})`
          : sql`r.tool_id=${tool}`;
    const relationships = resultRows<Row>(
      await tx.execute(
        sql`SELECT r.*,d.label,d.disclosure,p.name,p.status AS program_status FROM public.affiliate_relationships r JOIN public.affiliate_destinations d ON d.id=r.destination_id JOIN public.affiliate_programs p ON p.id=d.program_id WHERE ${where} ORDER BY r.updated_at DESC LIMIT 200`,
      ),
    );
    const clicks = resultRows<Row>(
      await tx.execute(
        sql`SELECT (c.created_at AT TIME ZONE 'UTC')::date::text AS day,c.tool_id,c.campaign_id,c.source,count(*)::int AS clicks FROM public.affiliate_clicks c JOIN public.affiliate_relationships r ON r.id=c.relationship_id WHERE ${where} AND c.created_at>=now()-interval '30 days' GROUP BY day,c.tool_id,c.campaign_id,c.source ORDER BY day DESC LIMIT 200`,
      ),
    );
    const conversions = resultRows<Row>(
      await tx.execute(
        sql`SELECT sum(e.conversion_count)::int AS conversions,sum(e.commission_cents)::bigint::text AS commission_cents FROM (SELECT DISTINCT ON(click_id) * FROM public.affiliate_reconciliations ORDER BY click_id,created_at DESC,id DESC) e JOIN public.affiliate_clicks c ON c.id=e.click_id JOIN public.affiliate_relationships r ON r.id=c.relationship_id WHERE ${where}`,
      ),
    );
    return {
      ready: true,
      programs:
        scope === "admin"
          ? resultRows<Row>(
              await tx.execute(
                sql`SELECT * FROM public.affiliate_programs ORDER BY updated_at DESC LIMIT 100`,
              ),
            )
          : [],
      destinations:
        scope === "admin"
          ? resultRows<Row>(
              await tx.execute(
                sql`SELECT * FROM public.affiliate_destinations ORDER BY updated_at DESC LIMIT 200`,
              ),
            )
          : [],
      relationships,
      clicks,
      conversions,
    };
  });
}
