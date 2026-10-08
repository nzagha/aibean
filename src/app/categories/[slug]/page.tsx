import { taxonomy } from "@/lib/catalog/taxonomy";
import { notFound, redirect } from "next/navigation";
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = taxonomy.categories.find((c) => c.slug === slug);
  if (!c) notFound();
  redirect(`/tools?category=${c.id}`);
}
