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
