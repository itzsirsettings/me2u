/** Keep post-login navigation on this application, including encoded input. */
export function safeNextPath(value: string | null): string | null {
  if (
    !value ||
    !value.startsWith("/") ||
    value.includes("\\") ||
    Array.from(value).some((character) => character.charCodeAt(0) <= 32)
  )
    return null;
  try {
    const base = "https://me2u.invalid";
    const url = new URL(value, base);
    if (url.origin !== base) return null;
    const decoded = decodeURIComponent(url.pathname);
    if (
      decoded.startsWith("//") ||
      decoded.includes("\\") ||
      Array.from(decoded).some((character) => character.charCodeAt(0) < 32)
    )
      return null;
    if (["/login", "/register"].includes(url.pathname.replace(/\/$/, ""))) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
