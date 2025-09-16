// env.server.ts
import { z } from "zod";

// Runtime guards to prevent misuse
if (typeof window !== "undefined") {
  throw new Error("env.server was imported in a browser bundle. Use env.client instead.");
}

const isEdge = typeof (globalThis as any).EdgeRuntime !== "undefined";
if (isEdge) {
  throw new Error("env.server loaded in Edge runtime. Mark route `export const runtime = 'nodejs'`.");
}

// Read NODE_ENV early with a safe default
const NODE_ENV = (process.env.NODE_ENV ?? "development") as
  | "development"
  | "production"
  | "test";

const baseSchema = z.object({
  // Client-exposed (also parsed again in env.client.ts)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(), // required in prod

  // Server-only
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1).optional(), // gated by flag below
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  LOG_SALT: z.string().optional(), // tightened below

  // Feature flags (string inputs)
  ENABLE_AI_PROCESSING: z.enum(["true", "false"]).default("false"),
  RATE_LIMITING: z.enum(["enabled", "disabled"]).default("disabled"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

// Validate raw env
const parsed = baseSchema.safeParse({ ...process.env, NODE_ENV });

if (!parsed.success) {
  console.error("\n❌ Invalid environment variables (server):\n");
  console.error(parsed.error.flatten().fieldErrors);
  console.error("\nFix your env (.env.local / project settings) and retry.\n");
  throw new Error("Environment validation failed (server).");
}

const env = parsed.data;

// Production-only guards
const issues: string[] = [];
if (env.NODE_ENV === "production") {
  if (!env.NEXT_PUBLIC_APP_URL) {
    issues.push("NEXT_PUBLIC_APP_URL is required in production.");
  }
  if (!env.LOG_SALT || env.LOG_SALT === "dev-salt" || env.LOG_SALT.length < 16) {
    issues.push("LOG_SALT must be a secure, >=16 chars value in production (not 'dev-salt').");
  }
  if (env.ENABLE_AI_PROCESSING === "true" && !env.OPENAI_API_KEY) {
    issues.push("OPENAI_API_KEY is required when ENABLE_AI_PROCESSING=true.");
  }
  // Optional: only if rate limiting is enabled
  if (env.RATE_LIMITING === "enabled") {
    if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
      issues.push("Rate limiting is enabled: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.");
    }
  }
}

// Test environment can have relaxed requirements
if (env.NODE_ENV === "test") {
  // Allow shorter LOG_SALT in test for CI simplicity
  if (env.LOG_SALT === "dev-salt") {
    // This is OK in test
  }
}

if (issues.length) {
  console.error("\n❌ Environment errors (server):");
  for (const m of issues) console.error(" - " + m);
  console.error("");
  // Include machine-readable format for CI
  console.error("ENV_CHECK_FAILED=" + JSON.stringify(issues));
  throw new Error("Environment validation failed (server).");
}

// Derive booleans & dev defaults safely (post-parse)
const ENABLE_AI = env.ENABLE_AI_PROCESSING === "true";
const ENABLE_RATE_LIMITING = env.RATE_LIMITING === "enabled";
const APP_URL =
  env.NEXT_PUBLIC_APP_URL ??
  (env.NODE_ENV !== "production" ? "http://localhost:3000" : undefined);

if (!APP_URL) {
  // Should only hit in prod because dev provides default above
  throw new Error("NEXT_PUBLIC_APP_URL is required.");
}

// Normalize origin for CORS usage
const APP_ORIGIN = new URL(APP_URL).origin;

// Environment mode helpers
const IS_PROD = env.NODE_ENV === "production";
const IS_DEV = env.NODE_ENV === "development";
const IS_TEST = env.NODE_ENV === "test";

// Freeze and export with readonly type
export const envServer = Object.freeze({
  // Environment modes
  NODE_ENV: env.NODE_ENV,
  IS_PROD,
  IS_DEV,
  IS_TEST,
  
  // Client-exposed
  NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: APP_URL,
  APP_ORIGIN, // Normalized origin for CORS
  
  // Server-only secrets
  SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
  OPENAI_API_KEY: env.OPENAI_API_KEY ?? null,
  UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL ?? null,
  UPSTASH_REDIS_REST_TOKEN: env.UPSTASH_REDIS_REST_TOKEN ?? null,
  LOG_SALT: env.LOG_SALT ?? "dev-salt",
  
  // Feature flags (as booleans)
  ENABLE_AI_PROCESSING: ENABLE_AI,
  ENABLE_RATE_LIMITING,
});

// Type export for use in other files
export type EnvServer = typeof envServer;

// Safe string truncation helper
const truncate = (s: string, n = 10): string => 
  s.length > n ? s.slice(0, n) + "..." : s;

// Helper to redact secrets when logging (for debugging)
export function redactedEnv(): Record<string, unknown> {
  return {
    ...envServer,
    SUPABASE_SERVICE_ROLE_KEY: "[REDACTED]",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: truncate(envServer.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    OPENAI_API_KEY: envServer.OPENAI_API_KEY ? "[REDACTED]" : null,
    UPSTASH_REDIS_REST_TOKEN: envServer.UPSTASH_REDIS_REST_TOKEN ? "[REDACTED]" : null,
    LOG_SALT: "[REDACTED]",
  };
}