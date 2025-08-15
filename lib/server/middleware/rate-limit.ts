/**
 * Rate Limiting Middleware
 * Production-only rate limiting using Upstash Redis
 * No-op in development for faster iteration
 */

import { RateLimitError } from '../errors';

// Type definitions for when packages aren't installed
type RateLimitResult = {
  success: boolean;
  limit: number;
  reset: number;
  remaining: number;
};

// Dynamic imports to avoid errors when Upstash isn't configured
let ratelimit: any = null;

// Only enable rate limiting in production with valid credentials
const initRateLimit = async () => {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      // @ts-ignore - Dynamic import, may not be installed
      const { Ratelimit } = await import('@upstash/ratelimit');
      // @ts-ignore - Dynamic import, may not be installed
      const { Redis } = await import('@upstash/redis');
      
      ratelimit = new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(10, '10 s'),
        analytics: true,
      });
    } catch (err: any) {
      console.log('Rate limiting disabled - Upstash not configured');
    }
  }
};

// Initialize on module load
initRateLimit();

/**
 * Check rate limit for a given identifier
 * @param identifier - Unique identifier (e.g., userId:endpoint)
 * @throws RateLimitError if limit exceeded
 */
export async function checkRateLimit(identifier: string): Promise<void> {
  if (!ratelimit) {
    // Skip rate limiting in development or when not configured
    return;
  }
  
  try {
    const { success, limit, reset, remaining } = await ratelimit.limit(identifier);
    
    if (!success) {
      throw new RateLimitError(
        'Rate limit exceeded. Please try again later.',
        {
          limit,
          remaining,
          reset: new Date(reset).toISOString()
        }
      );
    }
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    
    // Log but don't block on rate limit errors
    console.error('Rate limit check failed:', error);
    // Allow request to proceed if rate limiting fails
  }
}

/**
 * Rate limit configuration for different endpoint types
 */
export const RateLimits = {
  // Strict limits for expensive operations
  AI_PROCESSING: { requests: 5, window: '60 s' },
  FILE_UPLOAD: { requests: 10, window: '60 s' },
  
  // Standard limits for mutations
  CREATE: { requests: 20, window: '60 s' },
  UPDATE: { requests: 30, window: '60 s' },
  DELETE: { requests: 10, window: '60 s' },
  
  // Relaxed limits for reads
  READ: { requests: 100, window: '60 s' },
  SEARCH: { requests: 50, window: '60 s' },
} as const;

/**
 * Get rate limiter with custom configuration
 * For use when different endpoints need different limits
 */
export async function checkRateLimitWithConfig(
  identifier: string,
  config: { requests: number; window: string }
): Promise<void> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return; // Skip if not configured
  }
  
  try {
    // @ts-ignore - Dynamic import, may not be installed
    const { Ratelimit } = await import('@upstash/ratelimit');
    // @ts-ignore - Dynamic import, may not be installed
    const { Redis } = await import('@upstash/redis');
    
    const customLimiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(config.requests, config.window),
    });
    
    const { success } = await customLimiter.limit(identifier);
    
    if (!success) {
      throw new RateLimitError(
        `Rate limit exceeded (${config.requests} requests per ${config.window})`
      );
    }
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    // Silently fail if packages aren't installed
    console.log('Rate limiting skipped - packages not available');
  }
}