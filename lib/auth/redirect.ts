/**
 * Auth redirect sanitization utilities
 * Ensures redirect paths are safe and same-origin
 */

/**
 * Sanitizes the next parameter to prevent open redirects
 * @param nextParam - The next path from query params
 * @returns Safe redirect path (defaults to '/')
 */
export function sanitizeNextPath(nextParam: string | null | undefined): string {
  const next = nextParam ?? "/";
  // Only allow paths starting with '/' (same-origin)
  // Reject protocol-relative URLs (//), absolute URLs, and javascript:
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

/**
 * Compute origin properly handling proxies
 */
function computeOrigin(req: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return new URL(process.env.NEXT_PUBLIC_APP_URL).origin;
  }
  const h = req.headers;
  const xfProto = h.get('x-forwarded-proto');
  const xfHost = h.get('x-forwarded-host');
  if (xfProto && xfHost) return `${xfProto}://${xfHost}`;
  return new URL(req.url).origin;
}

/**
 * Sanitize a user-provided return/redirect URL so it's safe for redirects.
 * Rules:
 *  - Decode up to 2 times (handles encoded external URLs)
 *  - Normalize backslashes and limit length
 *  - Require leading slash for relative paths
 *  - Resolve against our base origin
 *  - Allow ONLY same-origin targets; return a normalized relative path
 *  - Collapse multiple slashes in path
 *  - Fallback to a safe default on any parse/error
 */
export function sanitizeReturnTo(
  input: string | null | undefined,
  req: Request,
  fallback: string = '/dashboard'
): string {
  try {
    if (!input) return fallback;

    // Decode up to 2 times (handles encoded external URLs)
    let value = input.trim();
    for (let i = 0; i < 2; i++) {
      try {
        const decoded = decodeURIComponent(value);
        if (decoded === value) break;
        value = decoded;
      } catch {
        break;
      }
    }

    // Normalize slashes & bound size
    value = value.replace(/\\+/g, '/');
    if (value.length > 2048) return fallback;

    // Fast reject: protocol-relative or any scheme
    if (/^\s*\/\//.test(value)) return fallback;
    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return fallback;

    // Require leading slash for relative paths (stricter policy)
    if (!value.startsWith('/')) return fallback;

    // Determine our public origin
    const baseOrigin = computeOrigin(req);

    // Resolve; protocol-relative resolves external -> caught by origin check
    const target = new URL(value, baseOrigin);

    // Only same-origin allowed
    if (target.origin !== baseOrigin) return fallback;

    // Normalize to relative path, collapse multiple slashes
    const normPath = target.pathname.replace(/\/{2,}/g, '/');
    return normPath + target.search + target.hash;
  } catch {
    return fallback;
  }
}
