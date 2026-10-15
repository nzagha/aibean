import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
// Decode only React's literal segment-placement metadata for HTTP tests.
// No page script, event handler, network resource or browser command is executed.
export function streamedDocument(html: string) {
  const dom = new JSDOM(html);
  const placements: { source: string; target: string }[] = [];
  for (const script of Array.from(dom.window.document.scripts)) {
    for (const m of (script.textContent || "").matchAll(
      /\$RS\("(S:[a-z0-9]+)","(P:[a-z0-9]+)"\)/gi,
    ))
      placements.push({ source: m[1], target: m[2] });
  }
  assert(placements.length <= 1000, "Bounded HTTP segment inventory exceeded");
  for (let pass = 0; pass < placements.length; pass++) {
    let moved = 0;
    for (const p of placements) {
      const source = dom.window.document.getElementById(p.source),
        target = dom.window.document.getElementById(p.target);
      if (!source || !target || !target.parentNode) continue;
      assert(
        source !== target && !source.contains(target),
        "Invalid HTTP segment placement",
      );
      const fragment = dom.window.document.createDocumentFragment();
      while (source.firstChild) fragment.appendChild(source.firstChild);
      target.replaceWith(fragment);
      source.remove();
      moved++;
    }
    if (!moved) break;
  }
  return dom;
}
