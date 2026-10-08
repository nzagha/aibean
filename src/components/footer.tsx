import Link from "next/link";
import { Logo } from "./logo";
import { ArrowUpRight } from "lucide-react";
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="flex flex-col justify-between gap-10 py-12 md:flex-row">
          <div>
            <Link href="/" aria-label="aiBean home">
              <Logo />
            </Link>
            <p className="mt-5 max-w-xs text-sm">
              Less noise. Better tools. Ship faster.
              <br />
              The AI tool discovery hub for doers.
            </p>
          </div>
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap gap-x-16 gap-y-8"
          >
            <div>
              <span className="eyebrow">Find your edge</span>
              <Link href="/tools">AI Tools</Link>
              <Link href="/skills">AI Skills</Link>
              <Link href="/playbooks">Playbooks</Link>
              <Link href="/events">Events</Link>
              <Link href="/creators">Creators</Link>
              <Link href="/industries">AI for Your Business</Link>
            </div>
            <div>
              <span className="eyebrow">Stay in the loop</span>
              <Link href="/#newsletter">
                Join the Run Club <ArrowUpRight size={14} />
              </Link>
              <span className="mt-3 block text-sm text-muted">
                Community channels coming soon.
              </span>
            </div>
          </nav>
        </div>
        <div className="flex flex-wrap justify-between gap-4 border-t border-line py-6 text-xs text-muted">
          <span>
            © {new Date().getFullYear()} aiBean. Built for your next move.
          </span>
          <span>MVP · Stage 1</span>
        </div>
      </div>
    </footer>
  );
}
