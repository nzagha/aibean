import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  SlidersHorizontal,
  BookOpen,
  Layers,
  Compass,
  Check,
} from "lucide-react";
import { DiscoverySections } from "@/components/discovery-sections";
import { ScopedSearch } from "@/components/scoped-search";
import { Newsletter } from "@/components/newsletter";
import { FeaturedTools } from "@/components/featured-tools";
import {
  ActiveDot,
  ExplorationProgress,
  PreviewCard,
  PreviewLink,
} from "@/components/interactive-preview";
import {
  featurePreviews,
  heroDiscovery,
  heroWorkflow,
} from "@/data/exploration-previews";

export const dynamic = "force-dynamic";

const features = [
  {
    icon: Compass,
    title: "Find your fit.",
    text: "Start with what you want to do. Discover tools by category, instead of opening another 30 tabs.",
    href: "/tools",
    link: "Explore tools",
  },
  {
    icon: SlidersHorizontal,
    title: "Get the full picture.",
    text: "A home for clear reviews, practical details, and side-by-side comparisons. Know what belongs in your stack.",
    href: "/tools",
    link: "Preview discovery",
  },
  {
    icon: BookOpen,
    title: "Turn tools into skills.",
    text: "Build your understanding with useful guides, hands-on tutorials, and ideas you can put to work.",
    href: "/skills",
    link: "Read the room",
  },
  {
    icon: Layers,
    title: "Build a better stack.",
    text: "Find focused collections and playbooks that connect the right tools to the work ahead.",
    href: "/playbooks",
    link: "Explore playbooks",
  },
];
export default function Home() {
  return (
    <>
      <section className="hero container" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="eyebrow flex items-center gap-2">
            <ActiveDot /> The AI tool discovery hub for doers
          </span>
          <h1 id="hero-title">
            Find.
            <br />
            Compare.
            <br />
            <span>Master.</span>
          </h1>
          <p className="hero-lead">
            Less noise. Better tools. Your next edge.
            <br />
            Discover AI that helps you do great work.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/tools" className="button primary">
              Find Your Edge <ArrowUpRight size={18} />
            </Link>
            <Link href="/playbooks" className="button secondary">
              Explore Playbooks <ArrowRight size={18} />
            </Link>
          </div>
          <ExplorationProgress />
        </div>
        <div className="hero-art" aria-label="aiBean discovery illustration">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit-dot" />
          <span className="art-kicker">
            A little curiosity.
            <br />A lot of possibility.
          </span>
          <img
            className="hero-bean"
            src="/brand/brand-blob.svg"
            alt="Cobalt blue bean with an orange sun"
            width="368"
            height="340"
            fetchPriority="high"
          />
          <PreviewCard
            className="floating-card card-one"
            preview={heroDiscovery}
          >
            <span className="icon-tile blue">
              <Compass size={23} />
            </span>
            <div>
              <strong>
                <PreviewLink preview={heroDiscovery}>
                  Your next great find.
                </PreviewLink>
              </strong>
              <span>Start with what you want to do.</span>
            </div>
            <ArrowUpRight size={20} />
          </PreviewCard>
          <PreviewCard
            className="floating-card card-two"
            preview={heroWorkflow}
          >
            <span className="icon-tile mint">
              <Check size={22} />
            </span>
            <div>
              <strong>
                <PreviewLink preview={heroWorkflow}>
                  Less scrolling. More doing.
                </PreviewLink>
              </strong>
              <span>Make room for better work.</span>
            </div>
          </PreviewCard>
          <span className="hand-note">good tools. great things.</span>
        </div>
      </section>
      <div className="container">
        <ScopedSearch />
      </div>
      <FeaturedTools />
      <DiscoverySections />
      <section className="features-section" aria-labelledby="features-title">
        <div className="container section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">From discovery to doing</span>
              <h2 id="features-title">A clearer route to better work.</h2>
            </div>
            <p className="max-w-sm">
              Finding a tool is just the start.
              <br />
              Make it part of how you work.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <PreviewCard
                className="feature-card"
                key={f.title}
                preview={featurePreviews[i]}
              >
                <div className="flex items-center justify-between">
                  <f.icon size={28} />
                  <span className="feature-number">0{i + 1}</span>
                </div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
                <PreviewLink
                  preview={featurePreviews[i]}
                  className="text-link mt-auto pt-7"
                >
                  {f.link} <ArrowRight size={16} />
                </PreviewLink>
              </PreviewCard>
            ))}
          </div>
        </div>
      </section>
      <section
        className="section container community"
        aria-labelledby="community-title"
      >
        <div>
          <span className="eyebrow">Better together</span>
          <h2 id="community-title">
            For the ones
            <br />
            who get things done.
          </h2>
          <p className="mt-5 max-w-sm">
            Founders, researchers, creators, and teams.
            <br />
            Different work. The same curiosity.
          </p>
          <Link href="#newsletter" className="text-link mt-6">
            Find your crew <ArrowRight size={18} />
          </Link>
          <div className="community-stamp" aria-hidden="true">
            TOOLS &gt; HYPE
            <br />
            <span>aiBean Run Club</span>
          </div>
        </div>
        <div className="community-preview">
          <span className="preview-label">Community stories · Preview</span>
          <h3>
            Your next great workflow
            <br />
            could start with someone else.
          </h3>
          <p>
            This is where the crew’s real experiences will live: what they
            tried, what worked, and what they shipped.
          </p>
          <div className="grid gap-4 border-t border-line pt-6 sm:grid-cols-3">
            {["The builders", "The researchers", "The creators"].map(
              (name, i) => (
                <div key={name}>
                  <span className="story-index">0{i + 1}</span>
                  <strong className="mt-3 block text-sm">{name}</strong>
                  <span className="mt-2 block text-xs text-muted">
                    Stories coming soon
                  </span>
                </div>
              ),
            )}
          </div>
          <p className="mt-6 text-xs text-muted">
            Testimonials will appear here once approved. No endorsements are
            implied.
          </p>
        </div>
      </section>
      <Newsletter />
    </>
  );
}
