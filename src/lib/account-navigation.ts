import { hasCapability } from "./capabilities";

export type AccountNavigation = { label: string; href: string }[];
export const guestNavigation: AccountNavigation = [
  { label: "Sign up", href: "/register" },
  { label: "Login", href: "/login" },
];

// Call only with a verified internal identity and server-owned database readers.
// These links are presentation; every destination still authorizes independently.
export async function resolveAccountNavigation(
  identity: string | null,
  readUser: (
    id: string,
  ) => Promise<
    { id: string; isAdmin: boolean; isCreator: boolean } | undefined
  >,
  readOwnership: (id: string) => Promise<{ userId: string; toolId: string }[]>,
): Promise<AccountNavigation> {
  if (!identity) return guestNavigation;
  const links: AccountNavigation = [{ label: "My Account", href: "/account" }];
  try {
    const user = await readUser(identity);
    if (!user || user.id !== identity) return links;
    const ownership = await readOwnership(identity);
    if (hasCapability(user, "admin"))
      links.unshift({ label: "Admin Dashboard", href: "/admin" });
    if (hasCapability(user, "creator"))
      links.push({ label: "Creator workspace", href: "/creator" });
    if (ownership.some((row) => row.userId === identity && Boolean(row.toolId)))
      links.push({ label: "Vendor workspace", href: "/vendor" });
  } catch {
    // Keep public browsing available during a database outage; never infer roles.
    return [{ label: "My Account", href: "/account" }];
  }
  return links;
}
