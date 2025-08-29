import { headers } from "next/headers";
import { serverOrigin } from "./env.server";
import { coreConfig } from "./env-core";

/**
 * Normalize origins by removing trailing slashes
 * Prevents double-slash bugs when joining URLs
 */
function normalizeOrigin(url: string): string {
  try {
    const u = new URL(url);
    u.pathname = "";
    u.search = "";
    u.hash = "";
    return u.origin; // returns without trailing slash
  } catch {
    // Fallback for invalid URLs - just strip trailing slashes
    return url.replace(/\/+$/, "");
  }
}

/**
 * Get the application origin URL
 * Uses centralized env configuration with runtime fallback
 * Priority: APP_ORIGIN > NEXT_PUBLIC_APP_ORIGIN > headers > default
 * @returns The full origin URL without trailing slash (e.g., https://example.com)
 */
export async function getAppOrigin(): Promise<string> {
  // 1) Server-specific APP_ORIGIN takes priority if set
  if (serverOrigin) {
    return normalizeOrigin(serverOrigin);
  }

  // 2) Check for public origin environment variables
  const publicOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN || coreConfig.app.url;
  const normalizedPublicOrigin = normalizeOrigin(publicOrigin);

  // If a real (non-default) origin is configured, trust it
  if (
    normalizedPublicOrigin &&
    normalizedPublicOrigin !== "http://localhost:3000"
  ) {
    return normalizedPublicOrigin;
  }

  // 3) Try to detect from proxy headers when available (preview/prod/tunnels)
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const xfHost = h.get("x-forwarded-host"); // Vercel/proxy canonical host
  const host = xfHost ?? h.get("host"); // Fallback to regular host

  if (host) {
    return normalizeOrigin(`${proto}://${host}`);
  }

  // 4) Final fallback (local dev default)
  return normalizedPublicOrigin; // typically http://localhost:3000
}
