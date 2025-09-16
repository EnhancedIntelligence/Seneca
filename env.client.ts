// env.client.ts
import { z } from "zod";

// This file is safe to import from client components
// It only exposes NEXT_PUBLIC_* variables

// Whitelist of allowed public keys for safety
const PUBLIC_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_URL",
] as const;

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

// In dev, default APP_URL; in prod, require it
const NODE_ENV = (process.env.NODE_ENV ?? "development") as
  | "development"
  | "production"
  | "test";

const raw = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL:
    process.env.NEXT_PUBLIC_APP_URL ??
    (NODE_ENV !== "production" ? "http://localhost:3000" : undefined),
};

const parsed = schema.safeParse(raw);

if (!parsed.success) {
  // This can run in browser too; keep output minimal
  // eslint-disable-next-line no-console
  console.error("Invalid client environment variables", parsed.error.flatten().fieldErrors);
  throw new Error("Environment validation failed (client).");
}

// Environment mode helpers
const IS_PROD = NODE_ENV === "production";
const IS_DEV = NODE_ENV === "development";
const IS_TEST = NODE_ENV === "test";

// Normalize origin for client-side CORS operations
const APP_ORIGIN = new URL(parsed.data.NEXT_PUBLIC_APP_URL).origin;

// Runtime misconfig guard in production
if (typeof window !== "undefined" && NODE_ENV === "production") {
  const mismatch = APP_ORIGIN !== window.location.origin;
  if (mismatch) {
    // eslint-disable-next-line no-console
    console.error(
      `[env.client] APP origin mismatch: configured=${APP_ORIGIN} actual=${window.location.origin}.`,
      `Fix NEXT_PUBLIC_APP_URL to match the deployed origin.`
    );
  }
}

// Type definition for the public environment shape
type PublicEnvShape = {
  readonly NODE_ENV: typeof NODE_ENV;
  readonly IS_PROD: boolean;
  readonly IS_DEV: boolean;
  readonly IS_TEST: boolean;
  readonly NEXT_PUBLIC_APP_URL: string;
  readonly NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  readonly NEXT_PUBLIC_SUPABASE_URL: string;
  readonly APP_ORIGIN: string;
};

// Freeze and export with readonly type, alphabetized for consistency
export const envClient = Object.freeze({
  APP_ORIGIN,
  IS_DEV,
  IS_PROD,
  IS_TEST,
  NEXT_PUBLIC_APP_URL: parsed.data.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_URL: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
  NODE_ENV,
} satisfies PublicEnvShape);

// Type export for use in other files
export type EnvClient = typeof envClient;