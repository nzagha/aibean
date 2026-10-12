import { PublicContentDetail } from "@/components/public-content-detail";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ campaign?: string }>;
}) {
  const { slug } = await params;
  const { campaign } = await searchParams;
  return (
    <PublicContentDetail
      kind="playbooks"
      slug={slug}
      campaignId={
        typeof campaign === "string" && campaign.length <= 100
          ? campaign
          : undefined
      }
    />
  );
}
