import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { readContentDetail } from "@/lib/content/queries";
import { CampaignBlocks } from "@/components/creator-enhancements";
export default async function Preview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const a = await requireAdmin(),
    { id } = await params,
    r = await readContentDetail(db(), a.id, "resources", id, "admin");
  if (!r) notFound();
  return (
    <section className="placeholder-card">
      <p className="preview-notice">Private editorial preview · {r.status}</p>
      <h2 className="text-3xl my-6">{r.title}</h2>
      <p>{r.summary}</p>
      <CampaignBlocks id={r.id} actor={a.id} scope="admin" />
    </section>
  );
}
