export type ExplorationState = { inspected: string[]; expanded: string[] };
export const EMPTY_EXPLORATION: ExplorationState = {
  inspected: [],
  expanded: [],
};
const safeIds = (value: unknown) =>
  Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (id): id is string =>
              typeof id === "string" && /^[a-zA-Z0-9:_-]{1,140}$/.test(id),
          ),
        ),
      ].slice(-200)
    : [];
export function parseExploration(value: unknown): ExplorationState {
  if (!value || typeof value !== "object") return EMPTY_EXPLORATION;
  const item = value as Record<string, unknown>;
  return {
    inspected: safeIds(item.inspected),
    expanded: safeIds(item.expanded),
  };
}
export function inspectNode(
  state: ExplorationState,
  id: string,
): ExplorationState {
  return parseExploration({ ...state, inspected: [...state.inspected, id] });
}
export function explorationProgress(state: ExplorationState) {
  return 20 + Math.min(8, new Set(state.inspected).size) * 10;
}
export type PreviewData = {
  id: string;
  title: string;
  summary: string;
  href: string;
  linkLabel: string;
  details: { title: string; text: string }[];
  notice?: string;
};
