import Link from "next/link";
import { ChevronRight } from "lucide-react";
export function PageIntro({
  name,
  title,
  children,
}: {
  name: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="page-intro">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/">Home</Link>
        <ChevronRight size={16} />
        <span aria-current="page">{name}</span>
      </nav>
      <span className="eyebrow">{name} · Early preview</span>
      <h1>{title}</h1>
      <p className="max-w-2xl text-lg">{children}</p>
    </div>
  );
}
