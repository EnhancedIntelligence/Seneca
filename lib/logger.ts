/**
 * Server-only logger facade with PII protection
 *
 * Environment variables:
 * - LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug' (default: 'debug' in dev, 'warn' in prod)
 * - LOG_CONSOLE_IN_PROD: 'true' to enable console logging in production (default: false)
 * - LOG_SALT: Salt for hashing IDs (default: 'dev-salt')
 */

import "server-only"; // throws if imported from a client bundle

export type LogMeta = Record<string, unknown>;

const env = process.env.NODE_ENV ?? "development";
const isProd = env === "production";
const isTest = env === "test";

// Log levels for filtering
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 } as const;
type Level = keyof typeof LEVELS;

// Safe LOG_LEVEL parsing with validation
const rawLevel = process.env.LOG_LEVEL?.toLowerCase();
const defaultLevel: Level = isProd ? "warn" : "debug";
const envLevel: Level =
  rawLevel && rawLevel in LEVELS ? (rawLevel as Level) : defaultLevel;
const allow = (level: Level) => LEVELS[level] <= LEVELS[envLevel];

// Optional console logging in production (for early launches)
const logToConsoleInProd = process.env.LOG_CONSOLE_IN_PROD === "true";

// Improved PII mask for common keys with proper depth handling
function maskPII(meta?: LogMeta, depth = 0): LogMeta | undefined {
  if (!meta) return undefined;
  if (depth > 2) return { _notice: "[Deep object truncated]" }; // Cap depth with safe fallback

  const masked: LogMeta = {};

  for (const [k, v] of Object.entries(meta)) {
    const key = k.toLowerCase();

    // Check for sensitive keys with word boundaries
    if (
      key === "token" ||
      key === "secret" ||
      key.endsWith("_token") ||
      key.endsWith("_secret")
    ) {
      masked[k] = "[REDACTED]";
    } else if (key === "email" || key.endsWith("_email")) {
      masked[k] = "[EMAIL]";
    } else if (key === "phone" || key.endsWith("_phone")) {
      masked[k] = "[PHONE]";
    } else if (
      key === "id" ||
      key === "userid" ||
      key === "user_id" ||
      key.endsWith("_id")
    ) {
      masked[k] = String(v).slice(0, 4) + "…";
    } else if (v instanceof Date) {
      // Handle Date objects properly
      masked[k] = v.toISOString();
    } else if (v instanceof URL) {
      // Handle URL objects
      masked[k] = v.toString();
    } else if (Array.isArray(v)) {
      // Mask arrays with PII detection (limit to first 10 items)
      masked[k] = v.slice(0, 10).map((item) => {
        // Check for PII in primitive values
        if (typeof item === "string") {
          if (item.includes("@")) return "[EMAIL]";
          if (/^\+?\d[\d\s\-().]{7,}$/.test(item)) return "[PHONE]";
          return item;
        }
        // Handle nested objects in arrays
        if (typeof item === "object" && item !== null) {
          return depth >= 2 ? "[Object]" : maskPII(item as LogMeta, depth + 1);
        }
        return item;
      });
      // Add indicator if array was truncated
      if (v.length > 10) {
        (masked[k] as unknown[]).push(`... +${v.length - 10} more`);
      }
    } else if (v && typeof v === "object") {
      // Recursively mask nested objects with depth protection
      masked[k] = depth >= 2 ? "[Object]" : maskPII(v as LogMeta, depth + 1);
    } else {
      masked[k] = v;
    }
  }

  return masked;
}

// Edge/Node-safe HMAC-SHA256 → 12-char hex
export async function hashId(id: string): Promise<string> {
  const salt = process.env.LOG_SALT || "dev-salt";

  // Use Web Crypto when available (Edge/modern Node)
  const g: any = globalThis as any;
  if (g.crypto?.subtle) {
    const enc = new TextEncoder();
    const key = await g.crypto.subtle.importKey(
      "raw",
      enc.encode(salt),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await g.crypto.subtle.sign("HMAC", key, enc.encode(id));
    const hex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hex.slice(0, 12);
  }

  // Node fallback (consistent with WebCrypto)
  const { createHmac } = await import("crypto");
  return createHmac("sha256", salt).update(id).digest("hex").slice(0, 12);
}

// Production sink for external logging services (can be async)
type Sink = (
  level: Level,
  payload: { messageOrError: unknown; meta?: LogMeta },
) => void | Promise<void>;
let prodSink: Sink | null = null;

export const setProdSink = (sink: Sink) => {
  prodSink = sink;
};

// TypeScript-safe console method map
const methodMap = {
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
} as const;

function devLog(fn: Level, messageOrError: unknown, meta?: LogMeta) {
  // Check if this log level is allowed
  if (!allow(fn)) return;

  // Skip logs in test environment
  if (isTest) return;

  // Handle production logging
  if (isProd) {
    // Forward to production sink if configured
    if (prodSink) {
      void prodSink(fn, { messageOrError, meta: maskPII(meta) });
    }
    // Skip console unless explicitly enabled
    if (!logToConsoleInProd) return;
  }

  // Log to console in dev or when explicitly enabled in prod
  const maskedMeta = maskPII(meta);
  const logMethod = methodMap[fn];

  // Only include meta in output if it has keys
  const args =
    maskedMeta && Object.keys(maskedMeta).length > 0 ? [maskedMeta] : [];

  logMethod(`[${fn.toUpperCase()}]`, messageOrError as any, ...args);
}

// Frozen logger API to prevent modifications
export const logger = Object.freeze({
  info: (message: string, meta?: LogMeta) => devLog("info", message, meta),
  warn: (message: string, meta?: LogMeta) => devLog("warn", message, meta),
  debug: (message: string, meta?: LogMeta) => devLog("debug", message, meta),
  error: (error: unknown, meta?: LogMeta) => {
    const err = error instanceof Error ? error : new Error(String(error));
    devLog("error", err, meta);
    // Note: devLog already handles prodSink forwarding - no double-send!

    // Example Sentry integration (uncomment when ready):
    // if (isProd && typeof window === 'undefined') {
    //   const Sentry = await import('@sentry/nextjs');
    //   Sentry.captureException(err, (scope) => {
    //     if (meta) scope.setContext('meta', maskPII(meta) as any);
    //   });
    // }
  },
});

// Module-scoped logger factory for pre-binding context
export const createLogger = (context: LogMeta) =>
  Object.freeze({
    info: (message: string, meta?: LogMeta) =>
      logger.info(message, { ...context, ...meta }),
    warn: (message: string, meta?: LogMeta) =>
      logger.warn(message, { ...context, ...meta }),
    debug: (message: string, meta?: LogMeta) =>
      logger.debug(message, { ...context, ...meta }),
    error: (error: unknown, meta?: LogMeta) =>
      logger.error(error, { ...context, ...meta }),
  });