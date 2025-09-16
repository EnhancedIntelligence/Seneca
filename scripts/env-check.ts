#!/usr/bin/env tsx
/**
 * Prebuild Environment Validation
 * Fails fast with clear diagnostics for both server and client env modules.
 */
import "dotenv/config";

type CheckResult = { name: string; ok: boolean; err?: unknown };

async function checkModule(name: string, loader: () => Promise<unknown>): Promise<CheckResult> {
  try {
    await loader();
    return { name, ok: true };
  } catch (err) {
    return { name, ok: false, err };
  }
}

function printError(prefix: string, err: unknown) {
  // Try to surface Zod and custom error payloads
  console.error(`❌ ${prefix} failed`);
  if (err && typeof err === "object") {
    const e = err as any;
    if (e.message) console.error("  Message:", e.message);

    // If it's a Zod error, try to show field errors
    if (e.issues && Array.isArray(e.issues)) {
      console.error("  Issues:");
      e.issues.forEach((issue: any) => {
        console.error(`    - ${issue.path?.join(".")}: ${issue.message}`);
      });
    }

    // Show first two stack lines for debugging
    if (e.stack && process.env.NODE_ENV === "development") {
      console.error("  Stack:", e.stack.split("\n").slice(0, 2).join("\n"));
    }
  } else {
    console.error(err);
  }
}

async function main() {
  console.log("🔍 Checking environment variables...");

  // Ensure NODE_ENV is set, default to development locally
  const nodeEnv = process.env.NODE_ENV || "development";
  if (!process.env.NODE_ENV) {
    console.log("ℹ️  NODE_ENV not set, defaulting to 'development'");
  }

  // Import TS modules directly (tsx handles it)
  const server = () => import("../env.server");
  const client = () => import("../env.client");

  const results = await Promise.all([
    checkModule("Server environment", server),
    checkModule("Client environment", client),
  ]);

  let hasErrors = false;
  for (const r of results) {
    if (r.ok) {
      console.log(`✅ ${r.name} valid`);
    } else {
      hasErrors = true;
      printError(r.name, r.err);
    }
  }

  if (hasErrors) {
    console.error("\n💡 Tips:");
    console.error("- Ensure .env.local / .env are present and correctly set");
    console.error("- In production, set NEXT_PUBLIC_APP_URL and a secure LOG_SALT (>=16 chars)");
    console.error("- Verify Supabase URL and anon key are valid URLs/strings");
    console.error("- If ENABLE_AI_PROCESSING=true, set OPENAI_API_KEY");
    console.error("- If RATE_LIMITING=enabled, set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN");

    // Show common fixes based on NODE_ENV
    if (nodeEnv === "production") {
      console.error("\n🚨 Production mode detected - all required variables must be set!");
    } else {
      console.error("\n💭 Development mode - some defaults will be applied");
    }

    process.exitCode = 1;
    return;
  }

  console.log("✅ Environment check passed");
  console.log(`   Mode: ${nodeEnv}`);
  console.log(`   Supabase: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
}

main().catch((e) => {
  printError("Environment check", e);
  process.exitCode = 1;
});