import { requireApprovedCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { readProfile } from "@/lib/content/queries";
import { readPresentation } from "@/lib/creator-enhancements/presentation";
import { PresentationDetails } from "@/components/creator-enhancements";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Private profile preview",
  robots: { index: false, follow: false },
};
export default async function Preview() {
  const a = await requireApprovedCreator(),
    p = await readProfile(db(), a.id),
    presentation = await readPresentation(db(), a.id, "owner", a.id);
  return (
    <div className="container py-16">
      <p className="preview-notice">
        Private profile preview · {p?.status || "Not yet created"}
      </p>
      <h1 className="font-display text-5xl my-6">
        {p?.display_name || "Your Creator profile"}
      </h1>
      <p className="whitespace-pre-wrap">{p?.bio}</p>
      <PresentationDetails presentation={presentation} />
    </div>
  );
}
