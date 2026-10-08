import { activeUseCases } from "@/lib/catalog/taxonomy";
import { notFound, redirect } from "next/navigation";
export default async function UseCasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = activeUseCases.find((c) => c.slug === slug);
  if (!c) notFound();
  redirect(`/tools?useCase=${c.id}`);
}
