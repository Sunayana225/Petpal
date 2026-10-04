/**
 * A sign-in return path is attacker-controllable (`?next=…`), and it is used in
 * a `Location:` header straight after authentication. Only ever accept a plain,
 * single-slash-rooted path on this site.
 *
 * Rejected, with reasons:
 *  - `https://evil.com`, `//evil.com` — absolute or protocol-relative, leaves us
 *  - `/\evil.com`, `/..\\evil.com` — some browsers normalise `\` to `/`
 *  - `/path\nSet-Cookie: …` — control characters have no place in a URL
 */
export function safeReturnPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const next = value.trim();
  if (next.length === 0 || next.length > 512) return null;
  if (!next.startsWith('/') || next.startsWith('//')) return null;
  if (next.includes('\\')) return null;
  // eslint-disable-next-line no-control-regex -- rejecting control characters is the point
  if (/[\u0000-\u001f\u007f]/.test(next)) return null;

  return next;
}
