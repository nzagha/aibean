// NextURL normalizes loopback names. Preserve the actual request Host for
// same-origin POSTs and redirects; never trust client-supplied forwarded hosts.
export function requestOrigin(
  request: Request,
  configured = process.env.NEXT_PUBLIC_APP_URL,
) {
  const incoming = new URL(request.url);
  const host = request.headers.get("host") || incoming.host;
  if (!host || /[\s/@\\?#]/.test(host)) throw Error("Invalid request host.");
  const origin = new URL(incoming.protocol + "//" + host);
  if (origin.host.toLowerCase() !== host.toLowerCase())
    throw Error("Invalid request host.");
  if (configured) {
    const canonical = new URL(configured);
    if (
      canonical.host !== origin.host ||
      !["https:", "http:"].includes(canonical.protocol) ||
      canonical.username ||
      canonical.password
    )
      throw Error("Request host does not match the configured application.");
    return canonical.origin;
  }
  return origin.origin;
}
export function isSameOrigin(request: Request) {
  try {
    return request.headers.get("origin") === requestOrigin(request);
  } catch {
    return false;
  }
}
