import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { contentKinds, type ContentKind } from "@/lib/content/contracts";
import { readContentDetail } from "@/lib/content/queries";
import { sql } from "drizzle-orm";
import { resultRows } from "@/lib/admin/tool-workflows";
import { ActionForm } from "./action-form";
import { changeSavedContent } from "@/app/content-actions";
import { publicAuthor } from "@/lib/content/queries";
import { ReportContent } from "./report-content";
import { PublishedFiles } from "./content-files";
export async function PublicContentDetail({
  kind,
  slug,
}: {
  kind: Exclude<ContentKind, "resources">;
  slug: string;
}) {
  if (!contentKinds.includes(kind)) notFound();
  const row = await readContentDetail(db(), null, kind, slug, "public");
  if (!row) notFound();
  const linkedTools = row.toolIds.length
    ? resultRows<{ id: string; name: string; slug: string }>(
        await db().execute(
          sql`SELECT id,name,slug FROM public.tools WHERE id IN (${sql.join(
            row.toolIds.map((id) => sql`${id}`),
            sql`, `,
          )}) AND status='published' ORDER BY name`,
        ),
      )
    : [];
  const linkedSkills = row.skillIds.length
    ? resultRows<{ id: string; title: string; slug: string }>(
        await db().execute(
          sql`SELECT s.id,s.title,s.slug FROM public.ai_skills s JOIN public.users u ON u.id=s.user_id WHERE s.id IN (${sql.join(
            row.skillIds.map((id) => sql`${id}`),
            sql`, `,
          )}) AND s.status='published' AND ${publicAuthor("skills")} ORDER BY s.title`,
        ),
      )
    : [];
  const [profile] = resultRows<{ handle: string; display_name: string }>(
    await db().execute(
      sql`SELECT p.handle,p.display_name FROM public.account_profiles p JOIN public.users u ON u.id=p.user_id WHERE p.user_id=${row.user_id} AND p.status='published' AND ${publicAuthor("skills")}`,
    ),
  );
  const text = (key: string) =>
    typeof row[key] === "string" ? String(row[key]) : "";
  const time = (key: string) =>
    new Date(String(row[key])).toLocaleString("en-US", {
      timeZone: text("timezone"),
      dateStyle: "medium",
      timeStyle: "short",
    });
  return (
    <div className="container py-16">
      <Link className="text-link" href={"/" + kind}>
        ← All {kind}
      </Link>
      <span className="eyebrow block mt-6">
        {kind}
        {kind === "playbooks" ? " · Free to read" : ""}
      </span>
      <h1 className="my-6 font-display text-5xl font-bold">{row.title}</h1>
      <p className="max-w-3xl text-lg mb-8">{row.summary}</p>
      {profile && (
        <Link className="text-link" href={"/@" + profile.handle}>
          By {profile.display_name} →
        </Link>
      )}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] mt-8">
        <article className="placeholder-card">
          {kind === "skills" && (
            <>
              <h2 className="text-2xl">What you’ll achieve</h2>
              <p className="my-5">{text("outcome")}</p>
              <h2 className="text-2xl">Instructions</h2>
              <p className="whitespace-pre-wrap my-5">{text("instructions")}</p>
              {text("prompts") && (
                <>
                  <h3 className="text-xl">Prompts</h3>
                  <p className="my-5 whitespace-pre-wrap">{text("prompts")}</p>
                </>
              )}
            </>
          )}
          {kind === "playbooks" && (
            <>
              <h2 className="text-2xl">{text("outcome")}</h2>
              <p className="my-5">
                {text("audience")} · {text("difficulty")} ·{" "}
                {String(row.minutes)} minutes
              </p>
              <ol className="list-decimal pl-6 space-y-6">
                {(row.steps as { title: string; instruction: string }[]).map(
                  (step, index) => (
                    <li key={index}>
                      <h3 className="text-xl">{step.title}</h3>
                      <p className="mt-3 whitespace-pre-wrap">
                        {step.instruction}
                      </p>
                    </li>
                  ),
                )}
              </ol>
            </>
          )}
          {kind === "events" && (
            <>
              <h2 className="text-2xl">{text("organizer")}</h2>
              <p className="my-5">
                {time("starts_at")} – {time("ends_at")} · {text("timezone")}
              </p>
              <p>
                {text("format").replaceAll("_", " ")} ·{" "}
                {[text("venue"), text("city"), text("country")]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <p className="my-5 whitespace-pre-wrap">{text("description")}</p>
              <form
                method="post"
                action={"/outbound/events/" + row.slug}
                target="_blank"
              >
                <button className="button primary">
                  Register with the organizer →
                </button>
              </form>
              <p className="text-sm mt-4">
                Registration and ticket payments take place on the organizer’s
                website.
              </p>
            </>
          )}
          {text("examples") && (
            <>
              <h2 className="text-2xl mt-8">Examples</h2>
              <p className="mt-5 whitespace-pre-wrap">{text("examples")}</p>
            </>
          )}
          {kind !== "events" && <PublishedFiles kind={kind} id={row.id} />}
        </article>
        <aside className="placeholder-card self-start">
          <h2 className="text-2xl">Make it yours</h2>
          <ReportContent kind={kind} id={row.id} />
          <ActionForm action={changeSavedContent} label="Save to my account">
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="id" value={row.id} />
          </ActionForm>
          <p className="text-sm my-5">
            Sign in to keep this in your personal collection.
          </p>
          {linkedTools.length > 0 && (
            <>
              <h3 className="text-xl">Tools</h3>
              {linkedTools.map((t) => (
                <Link
                  className="text-link block mt-4"
                  key={t.id}
                  href={"/tools/" + t.slug}
                >
                  {t.name} →
                </Link>
              ))}
            </>
          )}
          {linkedSkills.length > 0 && (
            <>
              <h3 className="text-xl mt-6">Related Skills</h3>
              {linkedSkills.map((s) => (
                <Link
                  className="text-link block mt-4"
                  key={s.id}
                  href={"/skills/" + s.slug}
                >
                  {s.title} →
                </Link>
              ))}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
