import { requireAdmin } from "@/lib/auth";
import { FeaturedAdmin } from "@/components/featured-admin";
import type { AdminParams } from "@/lib/admin/queries";
export default async function Featured({
  searchParams,
}: {
  searchParams: Promise<AdminParams>;
}) {
  await requireAdmin();
  return <FeaturedAdmin params={await searchParams} />;
}
