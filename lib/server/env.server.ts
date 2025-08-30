/**
 * Server-Only Environment Configuration
 * Optional features that only run on the server
 *
 * WARNING: This file should NEVER be imported in client components
 * Only use in: API routes, server components, server actions
 */

import { z } from "zod";
import { coreConfig } from "./env-core";

// Parse optional server features (won't crash if missing in dev)
const serverEnvSchema = z.object({
  // Supabase Service Role (for admin operations)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // AI Features
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().optional().default("gpt-4"),
  OPENAI_EMBEDDING_MODEL: z
    .string()
    .optional()
    .default("text-embedding-3-small"),

  // Rate Limiting
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // Internal Security
  INTERNAL_API_KEY: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(1).optional(),

  // Server-side origin override
  APP_ORIGIN: z.string().url().optional(),

  // Monitoring
  SENTRY_DSN: z.string().url().optional(),

  // Debug
  DEBUG: z.coerce.boolean().optional().default(false),
  CORS_ORIGINS: z.string().optional(),
});

// Parse with dev-friendly, prod-strict handling
const serverEnv = (() => {
  try {
    return serverEnvSchema.parse(process.env);
  } catch (error) {
    // In development, be permissive - optional features can be missing
    if (coreConfig.app.nodeEnv === "development") {
      console.log(
        "ℹ️ Optional server features not configured (this is OK in dev)",
      );
      return {} as z.infer<typeof serverEnvSchema>;
    }
    // In production/staging, fail fast to catch misconfigurations
    console.error("❌ Server environment validation failed in production:");
    if (error instanceof z.ZodError) {
      error.issues.forEach((issue) => {
        console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
      });
    }
    throw error;
  }
})();

/**
 * Supabase admin configuration
 */
export const supabaseAdmin = {
  serviceRoleKey: serverEnv.SUPABASE_SERVICE_ROLE_KEY,
  hasServiceRole: !!serverEnv.SUPABASE_SERVICE_ROLE_KEY,
} as const;

/**
 * AI configuration with feature flag
 */
export const ai = {
  isEnabled: !!serverEnv.OPENAI_API_KEY,
  apiKey: serverEnv.OPENAI_API_KEY,
  model: serverEnv.OPENAI_MODEL,
  embeddingModel: serverEnv.OPENAI_EMBEDDING_MODEL,
} as const;

/**
 * Rate limiting configuration with feature flag
 */
export const rateLimit = {
  isEnabled: !!(
    serverEnv.UPSTASH_REDIS_REST_URL && serverEnv.UPSTASH_REDIS_REST_TOKEN
  ),
  url: serverEnv.UPSTASH_REDIS_REST_URL,
  token: serverEnv.UPSTASH_REDIS_REST_TOKEN,
} as const;

/**
 * Security configuration
 */
export const security = {
  internalApiKey: serverEnv.INTERNAL_API_KEY,
  jwtSecret: serverEnv.JWT_SECRET,
  // Filter out empty strings from CORS origins
  corsOrigins: serverEnv.CORS_ORIGINS
    ? serverEnv.CORS_ORIGINS.split(",")
        .map((o) => o.trim())
        .filter(Boolean)
    : [],
  hasInternalApi: !!serverEnv.INTERNAL_API_KEY,
} as const;

/**
 * Monitoring configuration
 */
export const monitoring = {
  sentryDsn: serverEnv.SENTRY_DSN,
  isEnabled: !!serverEnv.SENTRY_DSN,
  debug: serverEnv.DEBUG,
} as const;

/**
 * Server-specific APP_ORIGIN if configured
 */
export const serverOrigin = serverEnv.APP_ORIGIN;

// Note: getAppOrigin is defined in ./origin.ts and uses serverOrigin
// This avoids circular dependencies

/**
 * Log server configuration status (only in dev/debug)
 */
export function logServerEnvStatus() {
  if (coreConfig.app.nodeEnv === "development" || serverEnv.DEBUG) {
    console.log("🔧 Server Environment Status:");
    console.log(
      `  - Supabase Admin: ${supabaseAdmin.hasServiceRole ? "✅" : "⚠️ No service role"}`,
    );
    console.log(`  - AI Features: ${ai.isEnabled ? "✅" : "⚠️ Disabled"}`);
    console.log(
      `  - Rate Limiting: ${rateLimit.isEnabled ? "✅" : "⚠️ Disabled"}`,
    );
    console.log(
      `  - Internal API: ${security.hasInternalApi ? "✅" : "⚠️ Disabled"}`,
    );
    console.log(
      `  - Monitoring: ${monitoring.isEnabled ? "✅" : "⚠️ Disabled"}`,
    );
  }
}
