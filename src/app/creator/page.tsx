export const dynamic = "force-dynamic";
import { requireUser } from "@/lib/auth";
export const metadata = {
  title: "Creator workspace",
  robots: { index: false, follow: false },
};
export default async function Creator() {
  const user = await requireUser("/creator", false);
  return (
    <div className="container py-16">
      <h1 className="font-display text-4xl font-bold">Creator workspace</h1>
      <p className="mt-6">
        {user.isCreator
          ? "Your Creator capability is approved. Publishing workflows arrive in the Creator stage."
          : "Creator applications and publishing will open in the Creator stage. Approval will be required before publishing."}
      </p>
    </div>
  );
}
