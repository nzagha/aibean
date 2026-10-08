export const dynamic = "force-dynamic";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { vendorAccess } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const metadata = {
  title: "Submit an AI Tool",
  robots: { index: false, follow: false },
};
export default async function SubmitTool() {
  const u = await requireUser("/submit/tool");
  const access = await db()
    .select()
    .from(vendorAccess)
    .where(eq(vendorAccess.userId, u.id));
  const eligible = u.isAdmin || u.isCreator || access.length > 0;
  return (
    <div className="container py-16">
      <h1 className="font-display text-4xl font-bold">Submit an AI Tool</h1>
      <p className="mt-6">
        {eligible
          ? "You are eligible to submit. Paid submissions open after the billing and submission review stage is configured."
          : "Submissions require approved Creator or Vendor capability. You can claim an existing tool or apply for Creator access when applications open."}
      </p>
    </div>
  );
}
