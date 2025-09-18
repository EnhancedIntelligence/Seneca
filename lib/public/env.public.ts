/**
 * Public Environment Configuration
 * Browser-safe variables that can be accessed from client components
 *
 * SAFE TO USE IN: Client components, server components, everywhere
 *
 * WARNING: Never put secrets here! Only NEXT_PUBLIC_* variables
 */

import { devLog, devError, devWarn } from "@/lib/client-debug";

// Extract and validate public variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const NODE_ENV = process.env.NODE_ENV ?? "development";

/**
 * Normalize origins by removing trailing slashes
 * Prevents double-slash bugs when joining URLs
 */
function normalizeOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url.replace(/\/+$/, "");
  }
}

/**
 * Public configuration accessible from browser
 * These are embedded in the client bundle - NEVER put secrets here
 */
export const publicEnv = {
  // Supabase public configuration
  supabase: {
    url: SUPABASE_URL ?? "",
    anonKey: SUPABASE_ANON ?? "",
    hasSupabase: !!(SUPABASE_URL && SUPABASE_ANON),
  },

  // Application URLs
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    origin:
      process.env.NEXT_PUBLIC_APP_ORIGIN ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000",
  },

  // Analytics (optional)
  analytics: {
    gaId: process.env.NEXT_PUBLIC_GA_ID,
    hasAnalytics: !!process.env.NEXT_PUBLIC_GA_ID,
  },

  // Environment
  nodeEnv: NODE_ENV,
} as const;

// Dev-only warning for missing required vars (won't crash, just warn)
if (NODE_ENV !== "production" && !publicEnv.supabase.hasSupabase) {
  // Only warn in development to help teammates
  if (typeof window !== "undefined") {
    // Client-side warning
    devWarn(
      "[publicEnv] ⚠️ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.\n" +
        "The UI may not function properly until these are set in .env.local\n" +
        "See .env.example for guidance."
    );
  } else {
    // Server-side warning (during SSR)
    devLog(
      "ℹ️ Public Supabase vars not configured. Add to .env.local:\n" +
        "   NEXT_PUBLIC_SUPABASE_URL=...\n" +
        "   NEXT_PUBLIC_SUPABASE_ANON_KEY=..."
    );
  }
}

// Helper functions for client-side checks
export const isDevEnvironment = NODE_ENV === "development";
export const isProdEnvironment = NODE_ENV === "production";

/**
 * Get the public app origin (browser-safe)
 * Always returns normalized origin without trailing slash
 */
export function getPublicOrigin(): string {
  return normalizeOrigin(publicEnv.app.origin);
}

/**
 * Check if the app is properly configured for client-side use
 */
export function isConfigured(): boolean {
  return publicEnv.supabase.hasSupabase;
}

/**
 * Type-safe public environment access
 */
export type PublicEnv = typeof publicEnv;
