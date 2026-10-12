import { z } from "zod";
import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { recordId, reasonInput } from "../admin/contracts";
export const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const publicHttps = z
  .string()
  .max(2000)
  .url()
  .refine((s) => {
    try {
      const u = new URL(s),
        h = u.hostname.toLowerCase();
      return (
        u.protocol === "https:" &&
        !u.username &&
        !u.password &&
        !u.hash &&
        (!u.port || u.port === "443") &&
        !isIP(h.replaceAll("[", "").replaceAll("]", "")) &&
        h.includes(".") &&
        !h.endsWith(".local") &&
        !h.endsWith(".internal") &&
        !h.endsWith(".localhost") &&
        !/^(localhost|metadata)\./.test(h) &&
        !/%|\\/.test(s) &&
        !Array.from(s).some((c) => c.charCodeAt(0) < 33)
      );
    } catch {
      return false;
    }
  }, "Use a public HTTPS destination without credentials, fragments, encoded controls or local addresses.");
export const hostInput = z
  .string()
  .regex(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/)
  .refine((h) => publicHttps.safeParse("https://" + h).success);
export const affiliateProgramInput = z
  .object({
    partner: z.string().trim().min(2).max(100),
    name: z.string().trim().min(2).max(100),
    hosts: z
      .array(hostInput)
      .min(1)
      .max(10)
      .refine((v) => new Set(v).size === v.length),
    proposedRateBps: z.coerce.number().int().min(0).max(10000).default(2000),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .refine(
    (v) => Date.parse(v.endsAt) > Date.parse(v.startsAt),
    "End must follow start.",
  );
export const templateParameters = z
  .record(
    z
      .string()
      .regex(/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/)
      .refine(
        (k) =>
          !/^(url|redirect|redirect_uri|next|return|return_url|target|destination|email|token|password|secret|key)$/i.test(
            k,
          ),
      ),
    z
      .string()
      .max(200)
      .regex(/^[a-zA-Z0-9._ {}-]*$/)
      .refine(
        (v) =>
          !v.includes("{") || ["{click}", "{tool}", "{campaign}"].includes(v),
      ),
  )
  .refine((v) => Object.keys(v).length <= 10);
export const destinationInput = z
  .object({
    programId: recordId,
    label: z.string().trim().min(2).max(100),
    url: publicHttps.refine(
      (s) => !new URL(s).search,
      "Place tracking parameters in the reviewed template fields.",
    ),
    parameters: templateParameters,
    disclosure: z.string().trim().min(20).max(500),
    enabled: z.boolean(),
  })
  .strict();
export const relationshipInput = z
  .object({
    destinationId: recordId,
    toolId: recordId,
    campaignId: recordId.nullable(),
    creatorShareBps: z.coerce.number().int().min(0).max(10000).default(0),
    enabled: z.boolean(),
  })
  .strict();
export const changeKey = z.object({
  id: recordId,
  revision: z.coerce.number().int().min(1),
  reason: reasonInput,
});
const social = z
  .object({
    network: z.enum([
      "linkedin",
      "youtube",
      "github",
      "instagram",
      "x",
      "bluesky",
    ]),
    url: publicHttps,
  })
  .strict()
  .refine((v) => {
    const hosts: Record<string, string[]> = {
      linkedin: ["www.linkedin.com", "linkedin.com"],
      youtube: ["www.youtube.com", "youtube.com", "youtu.be"],
      github: ["github.com"],
      instagram: ["www.instagram.com", "instagram.com"],
      x: ["x.com", "www.x.com"],
      bluesky: ["bsky.app"],
    };
    return hosts[v.network].includes(new URL(v.url).hostname);
  }, "Use the matching approved social network.");
export const presentationInput = z
  .object({
    headline: z.string().trim().max(160),
    biography: z
      .array(
        z
          .object({
            title: z.string().trim().min(2).max(80),
            body: z.string().trim().min(10).max(2000),
          })
          .strict(),
      )
      .max(6),
    socials: z
      .array(social)
      .max(6)
      .refine((v) => new Set(v.map((s) => s.network)).size === v.length),
    avatarFileId: recordId.nullable(),
    avatarAlt: z.string().trim().max(200),
    coverFileId: recordId.nullable(),
    coverAlt: z.string().trim().max(200),
  })
  .strict()
  .refine(
    (v) =>
      (!v.avatarFileId || v.avatarAlt.length > 3) &&
      (!v.coverFileId || v.coverAlt.length > 3),
    "Images require descriptive alternative text.",
  );
export const blockKinds = [
  "tools",
  "skills",
  "playbooks",
  "stacks",
  "events",
  "resources",
  "media",
  "text",
] as const;
export const blockInput = z
  .object({
    kind: z.enum(blockKinds),
    targetId: recordId.nullable(),
    title: z.string().trim().min(2).max(150),
    description: z.string().trim().max(3000),
  })
  .strict()
  .refine(
    (v) => (v.kind === "text") === (v.targetId === null),
    "Choose one canonical reference, or a text block.",
  );
export const campaignInput = z
  .array(blockInput)
  .max(40)
  .refine(
    (v) =>
      new Set(v.filter((x) => x.targetId).map((x) => x.kind + ":" + x.targetId))
        .size === v.filter((x) => x.targetId).length,
    "Remove duplicate references.",
  );
export type CampaignBlock = z.infer<typeof blockInput>;
export type Presentation = z.infer<typeof presentationInput>;
export const receiptInput = z
  .object({
    programId: recordId,
    eventId: z.string().regex(/^[a-zA-Z0-9_-]{3,120}$/),
    clickId: recordId,
    status: z.enum(["confirmed", "reversed"]),
    conversionCount: z.number().int().min(0).max(1),
    commissionCents: z.number().int().min(0).max(100000000),
    currency: z.literal("usd"),
    issuedAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .refine(
    (v) =>
      v.status !== "reversed" ||
      (v.conversionCount === 0 && v.commissionCents === 0),
    "Reversals must contain zero conversion and commission.",
  );
