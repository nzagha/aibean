# Behavioral interactions

The October 7, 2026 user request takes precedence over the attached Lovable prompt's suggestion to vary layouts. `versions/aibean-version-1.1.zip` preserves the build before these changes. All original CSS rules, fonts, color tokens, section order and grid classes are retained. React wrappers render the same anchor/article elements rather than adding grid children.

## What changed

- Hero cards, category cards, industry previews, tool cards, featured tools and feature cards reveal an overlay drawer. The original destinations remain in anchor `href` attributes, support modified clicks/new tabs, and are available as explicit links inside the drawer.
- The existing hero supporting-text line now contains progress and an unobtrusive session/return badge. The meter uses an absolute two-pixel line, so it introduces no additional layout row.
- Progress begins at a disclosed 20% head start and rises by 10% for each distinct discovery, capped at eight discoveries / 100%. Repeat clicks do not inflate progress. Explored cards receive a small checkmark. No visitor counts, artificial urgency or invented product insights are introduced.
- Framer Motion uses `{ type: "spring", stiffness: 300, damping: 20 }` for card, button, drawer, progress and disclosure feedback. The hero's existing status dot pulses gently. Reduced-motion preferences disable displacement/pulsing and make disclosure transitions immediate.
- Native modal dialogs provide keyboard containment. Escape, the close control and backdrop clicks dismiss previews. Focus returns to the triggering link. Drawers do not reopen automatically on reload. Browser-native keyboard/focus behavior still needs a real-browser QA pass.

## Persistence

`useLocalStorage` hydrates after mount, validates data, synchronizes storage events across tabs and falls back to memory when browser storage is blocked. The UI does not say progress is saved when writing fails.

- `aibean:exploration:v1`: unique inspected IDs and expanded insight IDs (each bounded to 200 entries).
- `aibean:comparison:v1`: at most four deduplicated tool IDs, names and slugs. Tool descriptions and other payloads are excluded.
- `aibean:filters:v1`: applied structured filters and advanced-filter disclosure state. Free-text searches and form data are excluded. Explicit URL filters override remembered choices; an unfiltered directory visit resumes saved filters. Clear controls remove remembered filters.

Drawer footer offers Reset exploration; the comparison tray and filter panel keep their own clear controls. These preferences are local to the browser and separate from account-backed saves, reviews, payments and authorization. No analytics service or external tracking was added.

## Validation

Unit and DOM tests cover bounded progress, deduplication, malformed data, rapid functional updates, reload restoration, cross-tab synchronization, reset, unavailable storage, in-context preview opening/closing, retained disclosure state and the returning badge. DOM tests use a dialog shim and reduced motion; they do not verify actual native focus trapping or pixel geometry. HTTP checks retain coverage of routes and protected workflows.

Source comparison against the Version 1.1 archive confirms every original CSS rule and the existing grid/hero/container/section classes are unchanged. Visual browser testing is unavailable because the computer-use runtime failed to initialize with a Windows sandbox ACL error.

Reference: [Motion transitions](https://motion.dev/docs/react-transitions). The current project stays on Next.js; no Lovable migration or design system replacement is involved.
