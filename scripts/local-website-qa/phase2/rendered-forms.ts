import assert from "node:assert/strict";
import { streamedDocument } from "./streamed-form";
import { writeFileSync } from "node:fs";
import { page, cookies, action, actionId, type App } from "./http-support";
export type Fields = Record<string, string | string[]>;
const feedback: {
  operation: string;
  expected: string;
  publicFeedback: string[];
}[] = [];
let operation = "direct action";
export function form(
  html: string,
  label: string,
  matching?: Record<string, string>,
) {
  const dom = streamedDocument(html);
  const found = Array.from(dom.window.document.forms).find(
    (f) =>
      Array.from(f.querySelectorAll("button")).some(
        (b) => b.textContent?.trim() === label,
      ) &&
      Object.entries(matching || {}).every(
        ([key, value]) =>
          f.querySelector<HTMLInputElement>(`[name="${key}"]`)?.value === value,
      ),
  );
  assert(found, "Expected rendered form unavailable");
  const values: Fields = {};
  for (const e of Array.from(found.elements) as (
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  )[]) {
    if (
      !e.name ||
      e.name.startsWith("$ACTION_") ||
      e.disabled ||
      e.tagName === "BUTTON"
    )
      continue;
    if (
      e.tagName === "INPUT" &&
      ["checkbox", "radio"].includes((e as HTMLInputElement).type) &&
      !(e as HTMLInputElement).checked
    )
      continue;
    if (values[e.name] !== undefined)
      values[e.name] = [
        ...(Array.isArray(values[e.name])
          ? (values[e.name] as string[])
          : [values[e.name] as string]),
        e.value,
      ];
    else values[e.name] = e.value;
  }
  dom.window.close();
  return values;
}
export async function submit(
  a: App,
  path: string,
  label: string,
  overrides: Fields = {},
  matching?: Record<string, string>,
) {
  operation = label;
  const p = await page(a, path, cookies.get(a.role));
  return action(a, path, actionId(p.html, label), {
    ...form(p.html, label, matching),
    ...overrides,
  });
}
export function message(r: { html: string }, text: string) {
  if (!r.html.includes(text)) {
    const values = Array.from(
      r.html.matchAll(/"(?:error|message)":("(?:\\.|[^"\\])*")/g),
    ).map((m) =>
      String(JSON.parse(m[1]))
        .replace(/https?:\/\/[^\s"<>]+/g, "[URL]")
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
        .replace(/[a-f0-9]{32,}/gi, "[opaque]")
        .slice(0, 350),
    );
    feedback.push({ operation, expected: text, publicFeedback: values });
    writeFileSync(
      "docs/evidence/local-ui-phase2-safe-action-feedback.json",
      JSON.stringify(
        { classification: "PUBLIC_FORM_FEEDBACK_ONLY", feedback },
        null,
        2,
      ) + "\n",
    );
  }
  assert(r.html.includes(text), "Expected action feedback unavailable");
}
