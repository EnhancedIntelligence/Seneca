#!/usr/bin/env node

/**
 * Migration Test Database Setup (CI-friendly)
 * - Applies all SQL files in supabase/migrations in filename order
 * - Runs each file via psql for precise error reporting
 * - Optional per-file single-transaction; supports opt-out via .no-tx.sql suffix
 */

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

// ==== Config ====
const DB_URL = process.env.TEST_DATABASE_URL;
const CLEAN = process.env.TEST_DB_CLEAN === "1"; // drop schema public first
const DEFAULT_STATEMENT_TIMEOUT = process.env.PSQL_STATEMENT_TIMEOUT || "300000"; // 5 min ms

if (!DB_URL) {
  console.error("❌ TEST_DATABASE_URL environment variable is required");
  console.error("   example: postgres://postgres:postgres@localhost:5432/seneca_test");
  process.exit(1);
}

// Check psql availability
const which = spawnSync(process.platform === "win32" ? "where" : "which", ["psql"], {
  encoding: "utf8",
});
if (which.status !== 0) {
  console.error("❌ 'psql' not found in PATH.");
  console.error("   macOS:   brew install libpq && echo 'export PATH=\"/opt/homebrew/opt/libpq/bin:$PATH\"' >> ~/.zshrc");
  console.error("   Ubuntu:  sudo apt-get update && sudo apt-get install -y postgresql-client");
  console.error("   Docker:  docker run --rm -e TEST_DATABASE_URL=... -v $PWD:/work -w /work postgres:15-alpine node scripts/migrate-testdb.js");
  process.exit(1);
}

// Mask URL for logs
function maskUrl(u) {
  try {
    const parsed = new URL(u);
    if (parsed.password) parsed.password = "***";
    if (parsed.username) parsed.username = "***";
    return parsed.toString();
  } catch {
    return u.replace(/:\/\/.*@/, "://***@");
  }
}

// Read migrations
const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
if (!fs.existsSync(migrationsDir)) {
  console.error(`❌ Migrations directory not found: ${migrationsDir}`);
  process.exit(1);
}

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => path.join(migrationsDir, f));

if (files.length === 0) {
  console.error("❌ No migration files found");
  process.exit(1);
}

console.log(`📦 Found ${files.length} migration files`);
console.log(`🗄️  Target database: ${maskUrl(DB_URL)}`);

// Optional: clean schema
if (CLEAN) {
  console.log("🧹 Dropping schema public (TEST_DB_CLEAN=1)...");
  const prelude = `
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO public;
    SET search_path TO public;
  `;
  const pre = spawnSync("psql", [DB_URL, "-v", "ON_ERROR_STOP=1"], {
    input: prelude,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (pre.status !== 0) {
    console.error("❌ Failed to clean schema");
    console.error(pre.stderr);
    process.exit(1);
  }
}

// Apply migrations one by one
console.log("\n🚀 Applying migrations...");
for (const file of files) {
  const name = path.basename(file);
  const singleTx = !name.endsWith(".no-tx.sql"); // opt-out convention
  const args = [
    DB_URL,
    "-v",
    "ON_ERROR_STOP=1",
    "-v",
    `statement_timeout=${DEFAULT_STATEMENT_TIMEOUT}`,
  ];
  if (singleTx) {
    args.push("--single-transaction");
  }

  console.log(`  • ${name}${singleTx ? " (tx)" : ""}`);
  const res = spawnSync("psql", args.concat(["-f", file]), {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"], // show file path as psql runs it
  });

  if (res.error) {
    console.error(`❌ Failed to run psql for ${name}:`, res.error.message);
    process.exit(1);
  }
  if (res.status !== 0) {
    console.error(`❌ Migration failed in ${name}`);
    if (res.stdout) console.error(res.stdout);
    if (res.stderr) console.error(res.stderr);
    process.exit(1);
  }
}

console.log("✅ All migrations applied successfully");
process.exit(0);