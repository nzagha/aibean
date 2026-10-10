import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { readAdminTool } from "@/lib/admin/queries";
import {
  categoryById,
  industryById,
  activeUseCases,
} from "@/lib/catalog/taxonomy";
import { ToolLogo } from "@/components/tool-logo";
export default async function Preview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const record = await readAdminTool(db(), admin.id, id);
  if (!record) notFound();
  const t = record.data;
  return (
    <section className="placeholder-card">
      <p className="preview-notice mb-6">
        Private Admin preview · {record.status}. This preview does not publish
        the Tool.
      </p>
      <div className="flex items-center gap-5">
        <ToolLogo tool={t} />
        <h2 className="font-display text-3xl">{t.name}</h2>
      </div>
      <p className="my-6">{t.description}</p>
      <dl className="grid gap-5 sm:grid-cols-2">
        {[
          ["Category", categoryById(t.categoryId)?.name || t.categoryId],
          [
            "Pricing",
            t.pricing + (t.startingPrice ? " · " + t.startingPrice : ""),
          ],
          ["Best for", t.bestFor],
          ["Not best for", t.notBestFor],
          ["Verification", t.verification],
          ["aiBean Verified", t.verified ? "Awarded" : "Not awarded"],
          ["Last Verified", t.lastVerified || "Never"],
          [
            "Free plan",
            t.freePlan == null ? "Unknown" : t.freePlan ? "Yes" : "No",
          ],
          ["Trial", t.trial == null ? "Unknown" : t.trial ? "Yes" : "No"],
        ].map(([name, value]) => (
          <div key={name}>
            <dt className="text-sm text-muted">{name}</dt>
            <dd className="mt-2">{value}</dd>
          </div>
        ))}
      </dl>
      {[
        ["Features", t.features],
        ["Integrations", t.integrations],
        ["Platforms", t.platforms],
        ["Strengths", t.pros],
        ["Limitations", t.limitations],
        [
          "Use cases",
          t.useCaseIds?.map(
            (id) => activeUseCases.find((c) => c.id === id)?.name || id,
          ),
        ],
        [
          "Industries",
          t.industries?.map(
            (i) =>
              (industryById(i.id)?.name || i.id) +
              " · " +
              i.fit +
              " · " +
              i.relevance,
          ),
        ],
      ].map(([name, items]) => (
        <div className="account-row" key={String(name)}>
          <h3 className="text-lg">{String(name)}</h3>
          <ul className="mt-3 list-disc pl-5">
            {((items as string[]) || []).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      ))}
      {t.website && (
        <a
          className="text-link"
          href={t.website}
          rel="noreferrer"
          target="_blank"
        >
          Official website ↗
        </a>
      )}
      <p className="mt-5">
        <Link
          className="text-link"
          href={"/admin/tools/" + encodeURIComponent(id)}
        >
          Return to editor →
        </Link>
      </p>
    </section>
  );
}
