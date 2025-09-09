/**
 * Rate Limiting Middleware
 * Production-only rate limiting using Upstash Redis
 * Gracefully falls back to no-op when not configured
 */

import { RateLimitError } from "../errors";

// Type for rate limit function
type RateLimitFunction = (key: string) => Promise<{
  success: boolean;
  limit?: number;
  remaining?: number;
  reset?: number;
}>;

// Rate limit function - will be assigned based on configuration
let checkRateLimitImpl: RateLimitFunction;

// Check if Upstash is configured
if (
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
) {
  // Async initialization for Upstash
  const initRateLimit = async (): Promise<RateLimitFunction> => {
    try {
      const { Ratelimit } = await import("@upstash/ratelimit");
      const { Redis } = await import("@upstash/redis");

      const ratelimit = new Ratelimit({
        redis: new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL!,
          token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        }),
        limiter: Ratelimit.slidingWindow(60, "1 m"), // 60 requests per minute
        analytics: true,
      });

      return (key: string) => ratelimit.limit(key);
    } catch (error) {
      console.warn("Failed to initialize rate limiting:", error);
      // Return no-op if initialization fails
      return async () => ({ success: true });
    }
  };

  // Lazy initialization - only initialize when first used
  let rateLimitPromise: Promise<RateLimitFunction> | null = null;

  checkRateLimitImpl = async (key: string) => {
    if (!rateLimitPromise) {
      rateLimitPromise = initRateLimit();
    }
    const fn = await rateLimitPromise;
    return fn(key);
  };
} else {
  // No-op implementation when Upstash is not configured
  checkRateLimitImpl = async () => ({ success: true });

  if (process.env.NODE_ENV === "development") {
    console.log("[Rate Limit] Disabled - Upstash not configured");
  }
}

/**
 * Check rate limit for a given identifier
 * @param identifier - Unique identifier (e.g., userId:endpoint)
 * @throws RateLimitError if limit exceeded
 */
export async function checkRateLimit(identifier: string): Promise<void> {
  const result = await checkRateLimitImpl(identifier);

  if (!result.success) {
    throw new RateLimitError(
      `Rate limit exceeded. Please try again in ${Math.ceil((result.reset || Date.now() + 60000) / 1000 - Date.now() / 1000)} seconds.`,
      result.reset,
    );
  }
}

/**
 * Get rate limit info without throwing
 * Useful for headers and debugging
 */
export async function getRateLimitInfo(identifier: string) {
  return checkRateLimitImpl(identifier);
}

// Export for testing
export { checkRateLimitImpl as _checkRateLimitImpl };
