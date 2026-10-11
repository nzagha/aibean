import { notFound, redirect } from "next/navigation";
import { resolveSubcategory } from "@/lib/catalog/subcategory";
export default async function Subcategory({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const { category: parent } = await searchParams;
  const match = resolveSubcategory(
    slug,
    typeof parent === "string" ? parent : undefined,
  );
  if (!match) notFound();
  const { category, subcategory } = match;
  redirect(
    "/tools?" +
      new URLSearchParams({
        category: category.id,
        subcategory: subcategory.id,
      }),
  );
}
