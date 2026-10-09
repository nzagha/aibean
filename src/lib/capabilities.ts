// Inputs must come from the server's canonical User/ownership queries.
// Never construct these from Auth user_metadata or submitted role fields.
type CapabilityUser = { id: string; isAdmin: boolean; isCreator: boolean };
export function hasCapability(
  user: CapabilityUser,
  capability: "user" | "admin" | "creator",
) {
  return (
    Boolean(user.id) &&
    (capability === "user" ||
      (capability === "admin"
        ? user.isAdmin === true
        : user.isCreator === true))
  );
}
export function ownsResource(
  user: Pick<CapabilityUser, "id">,
  ownerId: string | null | undefined,
) {
  return Boolean(user.id && ownerId && user.id === ownerId);
}
