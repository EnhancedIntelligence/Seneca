import { headers } from 'next/headers';

/**
 * Get the application origin URL
 * Prioritizes NEXT_PUBLIC_APP_ORIGIN env var, falls back to headers
 * @returns The full origin URL (e.g., https://example.com)
 */
export async function getAppOrigin(): Promise<string> {
  const envOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN;
  if (envOrigin) return envOrigin;

  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}