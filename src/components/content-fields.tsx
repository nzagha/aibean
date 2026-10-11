import { PlaybookSteps } from "./playbook-steps";
import { taxonomy, activeUseCases } from "@/lib/catalog/taxonomy";
import type { ContentKind, ContentRow } from "@/lib/content/contracts";
export type ReferenceOptions = {
  tools: { id: string; name: string }[];
  skills: { id: string; title: string }[];
  playbooks: { id: string; title: string }[];
};
export function ContentFields({
  kind,
  row,
  options,
}: {
  kind: ContentKind;
  row?: ContentRow;
  options: ReferenceOptions;
}) {
  const value = (name: string) =>
    row?.[name] != null && ["starts_at", "ends_at"].includes(name)
      ? new Date(row[name] as string).toISOString()
      : String(row?.[name] ?? "");
  const text = (
    name: string,
    label: string,
    field: string = name,
    max = 1200,
    min = 0,
  ) => (
    <label className="field" key={name}>
      {label}
      <textarea
        name={name}
        required={min > 0}
        minLength={min}
        maxLength={max}
        defaultValue={value(field)}
      />
    </label>
  );
  const input = (
    name: string,
    label: string,
    field: string = name,
    type = "text",
    max = 150,
    min = 0,
  ) => (
    <label className="field" key={name}>
      {label}
      <input
        name={name}
        type={type}
        required={min > 0}
        minLength={min}
        maxLength={max}
        defaultValue={value(field)}
      />
    </label>
  );
  const select = (
    name: string,
    label: string,
    items: { id: string; name: string }[],
    field: string = name,
    optional = false,
  ) => (
    <label className="field">
      {label}
      <select name={name} defaultValue={value(field)} required={!optional}>
        <option value="">{optional ? "None" : "Choose"}</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <>
      <div className="grid gap-x-5 sm:grid-cols-2">
        {input("title", "Title", "title", "text", 120, 3)}
        {input("slug", "Stable URL slug", "slug", "text", 100, 3)}
      </div>
      {text("summary", "Summary", "summary", 1200, 30)}
      {select("categoryId", "Category", taxonomy.categories, "category_id")}
      <div className="grid gap-x-5 sm:grid-cols-2">
        <details className="my-5">
          <summary className="cursor-pointer">Use cases</summary>
          {activeUseCases.map((item) => (
            <label className="flex gap-3 my-3" key={item.id}>
              <input
                type="checkbox"
                name="useCaseIds"
                value={item.id}
                defaultChecked={(
                  (row?.use_case_ids as string[]) || []
                ).includes(item.id)}
              />
              {item.name}
            </label>
          ))}
        </details>
        <details className="my-5">
          <summary className="cursor-pointer">Industries</summary>
          {taxonomy.industries.map((item) => (
            <label className="flex gap-3 my-3" key={item.id}>
              <input
                type="checkbox"
                name="industryIds"
                value={item.id}
                defaultChecked={(
                  (row?.industry_ids as string[]) || []
                ).includes(item.id)}
              />
              {item.name}
            </label>
          ))}
        </details>
      </div>
      {kind !== "resources" && (
        <details className="my-5">
          <summary className="cursor-pointer">Related published Tools</summary>
          {!options.tools.length && (
            <p className="my-3">No published Tools are available.</p>
          )}
          {options.tools.map((tool) => (
            <label key={tool.id} className="flex gap-3 my-3">
              <input
                type="checkbox"
                name="toolIds"
                value={tool.id}
                defaultChecked={row?.toolIds?.includes(tool.id)}
              />
              {tool.name}
            </label>
          ))}
        </details>
      )}
      {kind === "skills" && (
        <>
          {text("outcome", "Intended outcome", "outcome", 600, 20)}
          {text("instructions", "Instructions", "instructions", 20000, 30)}
          {text("prompts", "Prompts / configuration", "prompts", 10000)}
          {text("examples", "Examples / expected outputs", "examples", 6000)}
        </>
      )}
      {kind === "playbooks" && (
        <>
          {text("outcome", "Intended outcome", "outcome", 600, 20)}
          {text("audience", "Target audience", "audience", 500, 10)}
          {select(
            "difficulty",
            "Difficulty",
            ["beginner", "intermediate", "advanced"].map((id) => ({
              id,
              name: id,
            })),
          )}
          <label className="field">
            Estimated implementation minutes
            <input
              type="number"
              name="minutes"
              min={1}
              max={100000}
              required
              defaultValue={Number(row?.minutes) || 60}
            />
          </label>
          <PlaybookSteps
            initial={
              (row?.steps as { title: string; instruction: string }[]) || []
            }
          />
          {text("examples", "Examples / expected outputs", "examples", 6000)}
          <details className="my-5">
            <summary className="cursor-pointer">Related AI Skills</summary>
            {options.skills.map((skill) => (
              <label key={skill.id} className="flex gap-3 my-3">
                <input
                  type="checkbox"
                  name="skillIds"
                  value={skill.id}
                  defaultChecked={row?.skillIds?.includes(skill.id)}
                />
                {skill.title}
              </label>
            ))}
          </details>
          <p className="preview-notice my-4">
            Playbooks remain free to read. Sponsorship and paywalls cannot be
            configured here.
          </p>
        </>
      )}
      {kind === "resources" && (
        <>
          {input(
            "destination",
            "External course / resource destination",
            "destination",
            "url",
            2000,
            1,
          )}
          {text(
            "disclosure",
            "Commercial / affiliate disclosure",
            "disclosure",
            500,
            5,
          )}
          {select(
            "skillId",
            "Related Skill",
            options.skills.map((s) => ({ id: s.id, name: s.title })),
            "skill_id",
            true,
          )}
          {select(
            "playbookId",
            "Related Playbook",
            options.playbooks.map((p) => ({ id: p.id, name: p.title })),
            "playbook_id",
            true,
          )}
          <p className="preview-notice">
            External resource campaigns require moderation and a published
            Creator profile. Attached resource files require separate review.
          </p>
        </>
      )}
      {kind === "events" && (
        <>
          {text("description", "Event details", "description", 12000, 30)}
          {input("organizer", "Organizer", "organizer", "text", 150, 3)}
          {select(
            "eventType",
            "Event type",
            [
              "conference",
              "summit",
              "workshop",
              "creator_session",
              "vendor_webinar",
              "meetup",
              "training",
            ].map((id) => ({ id, name: id.replaceAll("_", " ") })),
            "event_type",
          )}
          {select(
            "format",
            "Format",
            ["in_person", "virtual", "hybrid"].map((id) => ({
              id,
              name: id.replaceAll("_", " "),
            })),
          )}
          <div className="grid gap-x-5 sm:grid-cols-2">
            {input("venue", "Venue", "venue", "text", 300)}
            {input("city", "City")}
            {input("country", "Country")}
            {input(
              "timezone",
              "IANA timezone (for example America/New_York)",
              "timezone",
              "text",
              100,
              1,
            )}
            {input(
              "startsAt",
              "Start (ISO date/time with timezone)",
              "starts_at",
              "text",
              100,
              1,
            )}
            {input(
              "endsAt",
              "End (ISO date/time with timezone)",
              "ends_at",
              "text",
              100,
              1,
            )}
          </div>
          {input("virtualUrl", "Virtual event URL", "virtual_url", "url", 2000)}
          {input(
            "registrationUrl",
            "External registration URL",
            "registration_url",
            "url",
            2000,
            1,
          )}
        </>
      )}
    </>
  );
}
