import { requireAdmin } from "@/lib/auth";
import { FeaturedAdmin } from "@/components/featured-admin";
export default async function Featured() {
  await requireAdmin();
  return <FeaturedAdmin />;
}
