/**
 * Environment Configuration
 * Validates and provides type-safe access to environment variables
 *
 * WARNING: This file should NEVER be imported in client components
 * Only use in server components, API routes, and server-side code
 */

import { z } from "zod";

// Environment schema validation - Most variables are OPTIONAL for local development
const envSchema = z.object({
  // Essential Supabase Configuration (REQUIRED for all environments)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Invalid Supabase URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "Supabase anon key is required"),

  // Application Origin (for callbacks, emails, etc)
  APP_ORIGIN: z.string().url().optional(),
  NEXT_PUBLIC_APP_ORIGIN: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .optional()
    .default("http://localhost:3000"),

  // Optional Supabase Configuration
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // AI Configuration (OPTIONAL - not needed for basic functionality)
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().optional().default("gpt-4"),
  OPENAI_EMBEDDING_MODEL: z
    .string()
    .optional()
    .default("text-embedding-3-small"),

  // Background Processing (OPTIONAL)
  INTERNAL_API_KEY: z.string().min(1).optional(),

  // Application Environment
  NODE_ENV: z
    .enum(["development", "staging", "production"])
    .default("development"),

  // Optional Features
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),
  DEBUG: z.coerce.boolean().optional().default(false),
  SKIP_ENV_VALIDATION: z.coerce.boolean().optional().default(false),
  TEST_DATABASE_URL: z.string().optional(),
});

// Parse and validate environment variables
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Use console.error for critical startup errors since logger may not be initialized
      console.error("❌ Environment validation failed:");
      console.error("\n🔴 Required variables missing:");

      const requiredErrors = error.issues.filter(
        (issue) =>
          issue.path[0] === "NEXT_PUBLIC_SUPABASE_URL" ||
          issue.path[0] === "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      );

      requiredErrors.forEach((issue) => {
        console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
      });

      if (requiredErrors.length > 0) {
        console.error("\n📋 Create a .env.local file with at minimum:");
        console.error("   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url");
        console.error("   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key");
        console.error("\n💡 See .env.example for all available options");
        process.exit(1);
      }
    }
    throw error;
  }
}

// Skip validation in some cases
const shouldSkipValidation =
  process.env.SKIP_ENV_VALIDATION === "true" || process.env.NODE_ENV === "test";

// Export validated environment variables
export const env = shouldSkipValidation ? (process.env as any) : validateEnv();

// Helper functions
export const isDevelopment = env.NODE_ENV === "development";
export const isProduction = env.NODE_ENV === "production";
export const isStaging = env.NODE_ENV === "staging";
export const isDebug = env.DEBUG === true;

/**
 * Get the application origin URL for callbacks and absolute URLs
 * Priority: APP_ORIGIN > NEXT_PUBLIC_APP_ORIGIN > NEXT_PUBLIC_APP_URL > default
 */
export function getAppOrigin(): string {
  return (
    env.APP_ORIGIN ??
    env.NEXT_PUBLIC_APP_ORIGIN ??
    env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  );
}

// Supabase configuration (always available)
export const supabaseConfig = {
  url: env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY, // undefined if not set
} as const;

// AI configuration (optional features)
export const aiConfig = {
  openaiApiKey: env.OPENAI_API_KEY, // undefined if not set
  model: env.OPENAI_MODEL,
  embeddingModel: env.OPENAI_EMBEDDING_MODEL,
  isEnabled: !!env.OPENAI_API_KEY,
} as const;

// Security configuration (optional)
export const securityConfig = {
  internalApiKey: env.INTERNAL_API_KEY, // undefined if not set
  jwtSecret: env.JWT_SECRET, // undefined if not set
  corsOrigins: env.CORS_ORIGINS?.split(",") || [],
} as const;

// Application configuration
export const appConfig = {
  url: getAppOrigin(),
  nodeEnv: env.NODE_ENV,
} as const;

// Rate limiting configuration (optional)
export const rateLimitConfig = {
  isEnabled: !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN),
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
} as const;

// Debug helper with security redaction
export function logEnvStatus() {
  if (isDevelopment || isDebug) {
    // Redact sensitive parts of URLs
    const redactedSupabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL.replace(
      /:\/\/([^.]*)\./,
      "://***.",
    );
    const redactedAppUrl = getAppOrigin().replace(/:\/\/([^@]*@)/, "://***@");

    // Use console.log for environment status since this runs at startup
    console.log("🔧 Environment Configuration:");
    console.log(`  - NODE_ENV: ${env.NODE_ENV}`);
    console.log(`  - Supabase: ✅ ${redactedSupabaseUrl}`);
    console.log(`  - App Origin: ${redactedAppUrl}`);
    console.log(
      `  - AI Features: ${aiConfig.isEnabled ? "✅ Enabled" : "⚠️ Disabled (no API key)"}`,
    );
    console.log(
      `  - Rate Limiting: ${rateLimitConfig.isEnabled ? "✅ Enabled" : "⚠️ Disabled (no Upstash)"}`,
    );
    console.log(`  - Debug Mode: ${isDebug ? "ON" : "OFF"}`);
  }
}

// Runtime environment checks
export function requireEnvironment(
  envName: "development" | "staging" | "production",
) {
  if (process.env.NODE_ENV !== envName) {
    throw new Error(
      `This operation requires NODE_ENV=${envName}, but got ${process.env.NODE_ENV}`,
    );
  }
}

// Safe environment variable access
export function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}

// Type-safe environment access
export type EnvVars = z.infer<typeof envSchema>;
