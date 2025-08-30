/**
 * Core Environment Configuration
 * Only the absolute minimum required variables
 * This file ALWAYS works for everyone - no optional dependencies
 */

/**
 * Simple validation - crashes early with helpful message if missing
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`❌ Missing required environment variable: ${name}`);
    console.error(`📋 Please add it to your .env.local file`);
    console.error(`💡 See .env.example for guidance`);
    process.exit(1);
  }
  return value;
}

/**
 * Core configuration that EVERYONE needs to run the app
 * Only these 2 variables are truly required
 */
export const coreConfig = {
  supabase: {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    nodeEnv: process.env.NODE_ENV || "development",
  },
} as const;

// Helper functions
export const isDevelopment = coreConfig.app.nodeEnv === "development";
export const isProduction = coreConfig.app.nodeEnv === "production";
export const isTest = coreConfig.app.nodeEnv === "test";
