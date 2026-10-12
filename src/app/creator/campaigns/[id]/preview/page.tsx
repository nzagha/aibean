import { notFound } from "next/navigation";
import { requireApprovedCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { readContentDetail } from "@/lib/content/queries";
import { CampaignBlocks } from "@/components/creator-enhancements";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Private campaign preview",
  robots: { index: false, follow: false },
};
export default async function Preview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const a = await requireApprovedCreator(),
    { id } = await params,
    r = await readContentDetail(db(), a.id, "resources", id, "owner");
  if (!r) notFound();
  return (
    <div className="container py-16">
      <p className="preview-notice">Private campaign preview · {r.status}</p>
      <h1 className="text-5xl font-display my-6">{r.title}</h1>
      <p>{r.summary}</p>
      <CampaignBlocks id={r.id} actor={a.id} scope="owner" />
    </div>
  );
}
