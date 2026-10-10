import { z } from "zod";
export function workspaceFilters(input: {
  q?: string;
  status?: string;
  page?: string;
}) {
  const status = z
    .enum(["draft", "published", "archived"])
    .safeParse(input.status);
  const requestedPage = Number(input.page || 1);
  return {
    q: (input.q || "").trim().slice(0, 100),
    status: status.success ? status.data : undefined,
    page:
      Number.isSafeInteger(requestedPage) && requestedPage > 0
        ? Math.min(requestedPage, 10000)
        : 1,
    size: 20,
  };
}
