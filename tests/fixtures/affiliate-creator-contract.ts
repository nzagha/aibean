import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import type {
  IdentityDatabase,
  IdentityTransaction,
} from "../../src/lib/supabase/identity";
import { resultRows } from "../../src/lib/admin/tool-workflows";
import {
  saveAffiliate,
  setProgramStatus,
  readAffiliates,
  reconcileAffiliate,
  campaignContains,
  hmacReceiptVerifier,
} from "../../src/lib/creator-enhancements/affiliates";
import {
  savePresentation,
  readPresentation,
  saveCampaignBlocks,
  readCampaignBlocks,
  unpublishCampaign,
  resolveCreatorImage,
} from "../../src/lib/creator-enhancements/presentation";
import {
  submitProfile,
  moderateProfile,
  submitContent,
  moderateContent,
} from "../../src/lib/content/workflows";
import { registerOutbound } from "../../src/lib/content/analytics";
import { recordAnalytics } from "../../src/lib/discovery/analytics";
import type { CampaignBlock } from "../../src/lib/creator-enhancements/contracts";
type DB = IdentityDatabase & IdentityTransaction;
export async function sourceRevision(
  db: DB,
  table: string,
  id: string,
  key = "id",
) {
  return resultRows<{ revision: string }>(
    await db.execute(
      sql`SELECT updated_at::text AS revision FROM public.${sql.identifier(table)} WHERE ${sql.identifier(key)}=${id}`,
    ),
  )[0].revision;
}
export async function setupAffiliateFixtures(db: DB) {
  await db.execute(
    sql`UPDATE public.ai_skills SET status='pending' WHERE id='dis-draft'`,
  );
  await db.execute(
    sql`UPDATE public.account_profiles SET status='published' WHERE user_id='dis-creator'`,
  );
  await db.execute(
    sql`UPDATE public.users SET is_creator=true WHERE id='dis-creator'`,
  );
  await db.execute(
    sql`UPDATE public.ai_skills SET status='published' WHERE id='dis-skill'`,
  );
  await db.execute(
    sql`UPDATE public.ai_playbooks SET status='published' WHERE id='dis-playbook'`,
  );
  await db.execute(
    sql`UPDATE public.public_events SET status='published' WHERE id='dis-event'`,
  );
  await db.execute(
    sql`UPDATE public.creator_resources SET status='published' WHERE id='dis-resource'`,
  );
  await db.execute(
    sql`UPDATE public.creator_resources SET summary='Synthetic approved resource summary',disclosure='Synthetic disclosed external resource' WHERE id='dis-resource'`,
  );
  await db.execute(
    sql`INSERT INTO public.stacks(id,user_id,name) VALUES('ac-stack','dis-creator','Public campaign Stack')`,
  );
  await db.execute(
    sql`INSERT INTO public.stack_settings(stack_id,visibility,ordered_tool_ids,note) VALUES('ac-stack','public','[]','Synthetic Stack note')`,
  );
  for (const [id, owner] of [
    ["ac-image", "dis-creator"],
    ["ac-foreign", "dis-b"],
  ])
    await db.execute(
      sql`INSERT INTO public.resource_files(id,user_id,skill_id,object_key,filename,mime,bytes,sha256,scan_status,status) VALUES(${id},${owner},'dis-skill',${"resources/" + id + "/image.png"},'image.png','image/png',100,${"a".repeat(64)},'clean','approved')`,
    );
}
export async function affiliateCreatorContract(db: DB) {
  const profile = {
    headline: "Working Creator profile",
    biography: [
      {
        title: "My work",
        body: "A synthetic structured biography with real validation.",
      },
    ],
    socials: [{ network: "github", url: "https://github.com/synthetic" }],
    avatarFileId: "ac-image",
    avatarAlt: "Synthetic Creator avatar",
    coverFileId: null,
    coverAlt: "",
  };
  const rev = await sourceRevision(
    db,
    "account_profiles",
    "dis-creator",
    "user_id",
  );
  await assert.rejects(savePresentation(db, "dis-a", rev, profile));
  await assert.rejects(
    savePresentation(db, "dis-creator", rev, {
      ...profile,
      avatarFileId: "ac-foreign",
    }),
  );
  await savePresentation(db, "dis-creator", rev, profile);
  await assert.rejects(savePresentation(db, "dis-creator", rev, profile));
  assert.equal(await readPresentation(db, "dis-creator", "public"), undefined);
  await assert.rejects(readPresentation(db, "dis-creator", "owner", "dis-b"));
  await submitProfile(
    db,
    "dis-creator",
    await sourceRevision(db, "account_profiles", "dis-creator", "user_id"),
  );
  await moderateProfile(db, "dis-admin", {
    id: "dis-creator",
    revision: await sourceRevision(
      db,
      "account_profiles",
      "dis-creator",
      "user_id",
    ),
    decision: "published",
    reason: "Synthetic approved profile",
  });
  assert.equal(
    (await readPresentation(db, "dis-creator", "public"))?.headline,
    profile.headline,
  );
  assert.equal(
    (await resolveCreatorImage(db, null, "ac-image")).filename,
    "image.png",
  );
  await assert.rejects(resolveCreatorImage(db, null, "ac-foreign"));
  const blocks: CampaignBlock[] = [
    {
      kind: "tools",
      targetId: "dis-t1",
      title: "Tool reference",
      description: "Canonical Tool explanation",
    },
    {
      kind: "skills",
      targetId: "dis-skill",
      title: "Apply this Skill",
      description: "Canonical implementation",
    },
    {
      kind: "playbooks",
      targetId: "dis-playbook",
      title: "Complete Playbook",
      description: "Step by step",
    },
    {
      kind: "stacks",
      targetId: "ac-stack",
      title: "Public Stack",
      description: "Tool collection",
    },
    {
      kind: "events",
      targetId: "dis-event",
      title: "Meet at this Event",
      description: "Approved Event",
    },
    {
      kind: "media",
      targetId: "ac-image",
      title: "Campaign image",
      description: "Synthetic image alternative text",
    },
    {
      kind: "text",
      targetId: null,
      title: "About the campaign",
      description: "Independent editorial content",
    },
  ];
  let campaignRev = await sourceRevision(
    db,
    "creator_resources",
    "dis-resource",
  );
  await assert.rejects(
    saveCampaignBlocks(db, "dis-b", "dis-resource", campaignRev, blocks),
  );
  await assert.rejects(
    saveCampaignBlocks(db, "dis-creator", "dis-resource", campaignRev, [
      ...blocks,
      {
        kind: "skills",
        targetId: "dis-draft",
        title: "Private content",
        description: "Must not leak",
      },
    ]),
  );
  await saveCampaignBlocks(
    db,
    "dis-creator",
    "dis-resource",
    campaignRev,
    blocks,
  );
  assert.equal(
    (await readCampaignBlocks(db, null, "dis-resource", "public")).blocks
      .length,
    0,
  );
  assert.equal(
    (await readCampaignBlocks(db, "dis-creator", "dis-resource", "owner"))
      .blocks.length,
    7,
  );
  await assert.rejects(
    readCampaignBlocks(db, "dis-b", "dis-resource", "owner"),
  );
  await assert.rejects(
    saveCampaignBlocks(db, "dis-creator", "dis-resource", campaignRev, blocks),
  );
  await submitContent(
    db,
    "dis-creator",
    "resources",
    "dis-resource",
    await sourceRevision(db, "creator_resources", "dis-resource"),
  );
  const pending = await sourceRevision(db, "creator_resources", "dis-resource");
  await assert.rejects(
    moderateContent(db, "dis-a", "resources", {
      id: "dis-resource",
      revision: pending,
      decision: "published",
      reason: "Unauthorized decision",
    }),
  );
  await moderateContent(db, "dis-admin", "resources", {
    id: "dis-resource",
    revision: pending,
    decision: "published",
    reason: "Approved synthetic campaign",
  });
  assert.equal(
    (await readCampaignBlocks(db, null, "dis-resource", "public")).blocks
      .length,
    7,
  );
  const session = { hash: "1".repeat(64), source: "resource" as const };
  assert.equal(
    await db.transaction((tx) =>
      recordAnalytics(tx, session, {
        event: "tool_view",
        kind: "tools",
        targetId: "dis-t1",
        campaignId: "dis-resource",
      }),
    ),
    true,
  );
  await assert.rejects(
    db.transaction((tx) =>
      recordAnalytics(tx, session, {
        event: "tool_view",
        kind: "tools",
        targetId: "dis-t2",
        campaignId: "dis-resource",
      }),
    ),
  );
  const program = {
    partner: "Synthetic partner",
    name: "Synthetic program",
    hosts: ["partner.invalid"],
    proposedRateBps: 2000,
    startsAt: new Date(Date.now() - 86400000).toISOString(),
    endsAt: new Date(Date.now() + 86400000).toISOString(),
  };
  await assert.rejects(
    saveAffiliate(
      db,
      "dis-vendor",
      "program",
      program,
      undefined,
      "Not authorized",
    ),
  );
  const p = await saveAffiliate(
      db,
      "dis-admin",
      "program",
      program,
      undefined,
      "Reviewed proposal",
    ),
    destination = {
      programId: p,
      label: "Synthetic destination",
      url: "https://partner.invalid/tool",
      parameters: { ref: "aibean", click: "{click}", campaign: "{campaign}" },
      disclosure:
        "aiBean may receive commission from this independently reviewed link.",
      enabled: true,
    };
  await assert.rejects(
    saveAffiliate(
      db,
      "dis-admin",
      "destination",
      { ...destination, url: "https://evil.invalid/path" },
      undefined,
      "Wrong host rejected",
    ),
  );
  const d = await saveAffiliate(
      db,
      "dis-admin",
      "destination",
      destination,
      undefined,
      "Reviewed destination",
    ),
    r = await saveAffiliate(
      db,
      "dis-admin",
      "relationship",
      {
        destinationId: d,
        toolId: "dis-t1",
        campaignId: "dis-resource",
        creatorShareBps: 0,
        enabled: true,
      },
      undefined,
      "Reviewed Tool campaign relationship",
    );
  let panel = await readAffiliates(db, "dis-admin", "admin"),
    prog = panel.programs.find((x) => x.id === p)!;
  await assert.rejects(
    setProgramStatus(db, "dis-admin", {
      id: p,
      revision: prog.revision,
      enabled: true,
      reason: "No owner approval",
    }),
  );
  assert.equal(
    await registerOutbound(
      db,
      "tools",
      "dis-t1",
      "internal",
      session,
      "dis-resource",
    ),
    "https://example.invalid/dis-t1",
  );
  assert.equal(
    resultRows<{ n: number }>(
      await db.execute(
        sql`SELECT count(*)::int AS n FROM public.affiliate_clicks`,
      ),
    )[0].n,
    0,
  );
  process.env.AIBEAN_AFFILIATE_APPROVED_PROGRAMS = JSON.stringify({
    [p]: prog.config_sha256,
  });
  process.env.AIBEAN_AFFILIATE_PROVIDER_VERIFIED = "true";
  await setProgramStatus(db, "dis-admin", {
    id: p,
    revision: prog.revision,
    enabled: true,
    reason: "Isolated synthetic approval",
  });
  const url = new URL(
    await registerOutbound(
      db,
      "tools",
      "dis-t1",
      "internal",
      session,
      "dis-resource",
      String(prog.config_sha256),
    ),
  );
  assert.equal(url.hostname, "partner.invalid");
  assert.equal(url.searchParams.get("campaign"), "dis-resource");
  assert.equal(
    await registerOutbound(
      db,
      "tools",
      "dis-t1",
      "internal",
      session,
      "dis-resource",
    ),
    "https://example.invalid/dis-t1",
    "An undisclosed or stale CTA never activates an affiliate redirect",
  );
  const second = await registerOutbound(
    db,
    "tools",
    "dis-t1",
    "internal",
    session,
    "dis-resource",
    String(prog.config_sha256),
  );
  assert.equal(
    new URL(second).searchParams.get("click"),
    url.searchParams.get("click"),
  );
  assert.equal(
    resultRows<{ n: number }>(
      await db.execute(
        sql`SELECT count(*)::int AS n FROM public.affiliate_clicks`,
      ),
    )[0].n,
    1,
  );
  await assert.rejects(
    registerOutbound(
      db,
      "tools",
      "dis-t2",
      "internal",
      session,
      "dis-resource",
    ),
  );
  await assert.rejects(readAffiliates(db, "dis-b", "vendor", "dis-t1"));
  assert.equal(
    (await readAffiliates(db, "dis-vendor", "vendor", "dis-t1")).clicks.length,
    1,
  );
  assert.equal(
    (await readAffiliates(db, "dis-creator", "creator")).clicks.length,
    1,
  );
  const receipt = {
    programId: p,
    eventId: "evt_synthetic",
    clickId: url.searchParams.get("click"),
    status: "confirmed",
    conversionCount: 1,
    commissionCents: 250,
    currency: "usd",
    issuedAt: new Date().toISOString(),
  };
  const receiptKey = randomBytes(32).toString("hex");
  process.env.AIBEAN_AFFILIATE_RECEIPT_KEYS = JSON.stringify({
    [p]: receiptKey,
  });
  const signature = (value: unknown) =>
    createHmac("sha256", receiptKey)
      .update(JSON.stringify(value))
      .digest("hex");
  await assert.rejects(
    reconcileAffiliate(
      db,
      "dis-admin",
      receipt,
      "invalid",
      { verify: async () => false },
      "Unsigned receipt rejected",
    ),
  );
  await assert.rejects(
    reconcileAffiliate(
      db,
      "dis-a",
      receipt,
      "synthetic",
      { verify: async () => true },
      "Ordinary user denied",
    ),
  );
  await reconcileAffiliate(
    db,
    "dis-admin",
    receipt,
    signature(receipt),
    hmacReceiptVerifier(),
    "Verified synthetic contract",
  );
  await reconcileAffiliate(
    db,
    "dis-admin",
    receipt,
    signature(receipt),
    hmacReceiptVerifier(),
    "Idempotent receipt retry",
  );
  await assert.rejects(
    reconcileAffiliate(
      db,
      "dis-admin",
      { ...receipt, commissionCents: 999 },
      "synthetic",
      { verify: async () => true },
      "Conflicting provider replay",
    ),
  );
  assert.equal(
    (await readAffiliates(db, "dis-vendor", "vendor", "dis-t1")).conversions[0]
      .commission_cents,
    "250",
  );
  const reversed = {
    ...receipt,
    eventId: "evt_reversed",
    status: "reversed",
    commissionCents: 0,
    conversionCount: 0,
  };
  await reconcileAffiliate(
    db,
    "dis-admin",
    reversed,
    signature(reversed),
    hmacReceiptVerifier(),
    "Provider-confirmed reversal",
  );
  const reconfirmed = { ...receipt, eventId: "evt_reconfirmation" };
  await assert.rejects(
    reconcileAffiliate(
      db,
      "dis-admin",
      reconfirmed,
      signature(reconfirmed),
      hmacReceiptVerifier(),
      "Terminal reversal cannot create another conversion",
    ),
  );
  const future = {
    ...receipt,
    eventId: "evt_future",
    issuedAt: new Date(Date.now() + 3600000).toISOString(),
  };
  await assert.rejects(
    reconcileAffiliate(
      db,
      "dis-admin",
      future,
      signature(future),
      hmacReceiptVerifier(),
      "Future evidence rejected",
    ),
  );
  assert.equal(
    (await readAffiliates(db, "dis-vendor", "vendor", "dis-t1")).conversions[0]
      .commission_cents,
    "0",
  );
  const burst = { hash: "3".repeat(64), source: "resource" as const };
  for (let i = 0; i < 30; i++)
    await registerOutbound(
      db,
      "tools",
      "dis-t1",
      "internal",
      burst,
      "dis-resource",
      String(prog.config_sha256),
    );
  await assert.rejects(
    registerOutbound(
      db,
      "tools",
      "dis-t1",
      "internal",
      burst,
      "dis-resource",
      String(prog.config_sha256),
    ),
  );
  await assert.rejects(
    db.execute(
      sql`UPDATE public.creator_revision_history SET revision='tampered'`,
    ),
  );
  await assert.rejects(
    db.execute(
      sql`UPDATE public.affiliate_reconciliations SET commission_cents=999`,
    ),
  );
  delete process.env.AIBEAN_AFFILIATE_RECEIPT_KEYS;
  await saveAffiliate(
    db,
    "dis-admin",
    "relationship",
    {
      destinationId: d,
      toolId: "dis-t1",
      campaignId: "dis-resource",
      creatorShareBps: 0,
      enabled: false,
    },
    { id: r, revision: 1 },
    "Disable relationship and approval",
  );
  assert.equal(
    await registerOutbound(
      db,
      "tools",
      "dis-t1",
      "internal",
      session,
      "dis-resource",
    ),
    "https://example.invalid/dis-t1",
  );
  panel = await readAffiliates(db, "dis-admin", "admin");
  prog = panel.programs.find((x) => x.id === p)!;
  assert.equal(prog.status, "disabled");
  await db.execute(
    sql`UPDATE public.ai_skills SET status='archived' WHERE id='dis-skill'`,
  );
  const publicBlocks = await readCampaignBlocks(
    db,
    null,
    "dis-resource",
    "public",
  );
  assert.equal(
    publicBlocks.blocks.some((b) => b.kind === "skills" || b.kind === "media"),
    false,
  );
  assert.equal(
    (await readPresentation(db, "dis-creator", "public"))?.avatarFileId,
    null,
  );
  await db.execute(
    sql`UPDATE public.ai_skills SET status='published' WHERE id='dis-skill'`,
  );
  campaignRev = await sourceRevision(db, "creator_resources", "dis-resource");
  await unpublishCampaign(db, "dis-creator", "dis-resource", campaignRev);
  assert.equal(
    (await readCampaignBlocks(db, null, "dis-resource", "public")).blocks
      .length,
    0,
  );
  await db.execute(
    sql`UPDATE public.account_profiles SET status='suspended' WHERE user_id='dis-creator'`,
  );
  assert.equal(await readPresentation(db, "dis-creator", "public"), undefined);
  await assert.rejects(
    savePresentation(
      db,
      "dis-creator",
      await sourceRevision(db, "account_profiles", "dis-creator", "user_id"),
      profile,
    ),
  );
  await db.execute(
    sql`UPDATE public.account_profiles SET status='published' WHERE user_id='dis-creator'`,
  );
  assert.equal(
    await db.transaction((tx) =>
      campaignContains(tx, "dis-resource", "tools", "dis-t1"),
    ),
    false,
  );
}
