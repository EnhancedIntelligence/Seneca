/**
 * Rate Limiting Middleware (Server-only, Node.js runtime required)
 * Token bucket implementation with memory storage for dev, Upstash for production
 *
 * IMPORTANT: Routes using this must set: export const runtime = "nodejs"
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";
import { createHash } from "node:crypto";

// Import env directly - routes using this must set runtime = "nodejs"
import { envServer } from "@/env.server";

function getEnv() {
  return envServer;
}

// Hash function for safe key generation
const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);

// In-memory storage for development
class MemoryStorage {
  private buckets = new Map<string, { tokens: number; lastRefill: number }>();

  private refill(key: string, maxTokens: number, refillRate: number): number {
    const bucket = this.buckets.get(key) || { tokens: maxTokens, lastRefill: Date.now() };
    const now = Date.now();
    const elapsedMs = now - bucket.lastRefill;

    // Accumulate fractional tokens
    const tokensToAdd = (elapsedMs / 1000) * refillRate;
    bucket.tokens = Math.min(maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    this.buckets.set(key, bucket);
    return Math.floor(bucket.tokens); // Return integer for consumption
  }

  async consume(
    key: string,
    tokens: number = 1,
    maxTokens: number = 60,
    refillRate: number = 1
  ): Promise<{ success: boolean; remaining: number }> {
    const currentTokens = this.refill(key, maxTokens, refillRate);

    if (currentTokens >= tokens) {
      const bucket = this.buckets.get(key)!;
      bucket.tokens = Math.max(0, bucket.tokens - tokens);
      this.buckets.set(key, bucket);
      return { success: true, remaining: Math.floor(bucket.tokens) };
    }

    return { success: false, remaining: currentTokens };
  }

  // Cleanup old buckets periodically (prevent memory leak)
  cleanup() {
    const now = Date.now();
    const staleTime = 5 * 60 * 1000; // 5 minutes
    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > staleTime) {
        this.buckets.delete(key);
      }
    }
  }
}

// Singleton instances
let upstashLimiter: Ratelimit | null = null;
let memoryLimiter: MemoryStorage | null = null;

// Cleanup memory storage periodically in dev
if (process.env.NODE_ENV === "development") {
  setInterval(() => memoryLimiter?.cleanup(), 60000); // Every minute
}

/**
 * Get rate limiter instance based on environment configuration
 */
function getRateLimiter(): Ratelimit | MemoryStorage {
  const env = getEnv();

  if (env.ENABLE_RATE_LIMITING && env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    if (!upstashLimiter) {
      const redis = new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      });

      upstashLimiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, "1 m"), // 60 requests per minute
        analytics: true,
      });
    }
    return upstashLimiter;
  }

  // Fallback to memory storage
  if (!memoryLimiter) {
    memoryLimiter = new MemoryStorage();
  }
  return memoryLimiter;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  limit: number;
  reset?: Date;
}

/**
 * Rate limit check for API routes
 * @param key - Unique identifier for rate limiting (e.g., user ID, IP)
 * @param limit - Maximum requests allowed (default: 60)
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 */
export async function rateLimit(
  key: string,
  limit: number = 60,
  windowMs: number = 60000
): Promise<RateLimitResult> {
  const env = getEnv();

  // Skip rate limiting if disabled (in any environment)
  if (!env.ENABLE_RATE_LIMITING) {
    return { success: true, remaining: limit, limit };
  }

  const limiter = getRateLimiter();

  // Feature-detect Upstash limiter
  if ("limit" in limiter) {
    // Upstash rate limiting
    const { success, remaining, reset } = await (limiter as Ratelimit).limit(key);
    return {
      success,
      remaining,
      limit,
      // reset is in seconds, convert to milliseconds
      reset: reset ? new Date(reset * 1000) : undefined
    };
  } else {
    // Memory rate limiting
    const tokensPerSecond = limit / (windowMs / 1000);
    const result = await (limiter as MemoryStorage).consume(key, 1, limit, tokensPerSecond);
    return {
      success: result.success,
      remaining: result.remaining,
      limit,
      reset: new Date(Date.now() + windowMs),
    };
  }
}

/**
 * Rate limit middleware for API routes
 * Extracts identifier and applies rate limiting
 */
export async function withRateLimit(
  request: NextRequest,
  options: {
    keyPrefix?: string;
    limit?: number;
    windowMs?: number;
    extractKey?: (req: NextRequest) => string | Promise<string>;
  } = {}
): Promise<RateLimitResult> {
  const {
    keyPrefix = "api",
    limit = 60,
    windowMs = 60000,
    extractKey = (req) => {
      // Try to get user ID from auth header or session
      const authHeader = req.headers.get("authorization");
      if (authHeader) {
        // Hash the auth header to avoid leaking token material
        return `${keyPrefix}:auth:${hash(authHeader)}`;
      }

      // Fallback to IP-based rate limiting
      const forwarded = req.headers.get("x-forwarded-for");
      const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
      return `${keyPrefix}:ip:${ip}`;
    },
  } = options;

  const key = await extractKey(request);
  return rateLimit(key, limit, windowMs);
}

/**
 * Create rate limit headers for response
 * Includes both X-RateLimit-* (de facto) and RateLimit-* (RFC draft) headers
 */
export function rateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();

  // X-RateLimit headers (de facto standard)
  headers.set("X-RateLimit-Limit", String(result.limit));
  headers.set("X-RateLimit-Remaining", String(result.remaining));

  if (result.reset) {
    headers.set("X-RateLimit-Reset", result.reset.toISOString());
  }

  // RFC draft headers (use seconds for reset)
  headers.set("RateLimit-Limit", String(result.limit));
  headers.set("RateLimit-Remaining", String(result.remaining));

  if (result.reset) {
    const secondsUntilReset = Math.max(0, Math.ceil((result.reset.getTime() - Date.now()) / 1000));
    headers.set("RateLimit-Reset", String(secondsUntilReset));
  }

  return headers;
}

/**
 * Helper to create a rate-limited response
 */
export function rateLimitedResponse(result: RateLimitResult): Response {
  const headers = rateLimitHeaders(result);
  headers.set("Content-Type", "application/json");
  headers.set("Retry-After", String(Math.ceil((result.reset?.getTime() || Date.now() + 60000 - Date.now()) / 1000)));

  return new Response(
    JSON.stringify({
      error: "Too Many Requests",
      message: "Rate limit exceeded. Please try again later.",
      retryAfter: result.reset?.toISOString(),
    }),
    {
      status: 429,
      headers,
    }
  );
}