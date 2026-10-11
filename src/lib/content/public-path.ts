// Next.js can retain the encoded @ marker in dynamic route parameters.
// Decode exactly once, then validate the entire segment; encoded path separators
// and double encoding never turn into a different Creator/resource route.
export function creatorHandle(segment: string) {
  try {
    const decoded = decodeURIComponent(segment);
    return /^@[a-z0-9][a-z0-9-]{2,29}$/.test(decoded) ? decoded.slice(1) : null;
  } catch {
    return null;
  }
}
