/**
 * Rate limiting middleware for API routes (Upstash Redis + @upstash/ratelimit)
 * - Privacy: hashes IPs before they hit Redis
 * - Correct headers: X-RateLimit-Reset (epoch seconds), RateLimit-Reset (delta seconds)
 * - Route scoping so buckets don't collide across endpoints with identical configs
 */

import { Ratelimit, type Duration } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { APIException, ErrorCode } from './errors';
import type { RateLimitHeaders } from '@/lib/types/api/memories';

export interface RateLimitConfig {
  requests: number;
  window: string;               // e.g., "1m", "15m", "1h"
  identifier: 'ip' | 'user' | 'ip_and_user';
  scope?: string;               // optional route scope, e.g., "createMemory"
  hashIp?: boolean;             // default true
}

export const RATE_LIMIT_CONFIGS = {
  // Standard POST endpoints
  post: {
    requests: 30,
    window: '1m',
    identifier: 'ip_and_user',
    scope: 'post',
  },
  // Memory creation is more expensive
  createMemory: {
    requests: 10,
    window: '1m',
    identifier: 'user',
    scope: 'createMemory',
  },
  // Media upload/finalize is most expensive
  finalizeMemory: {
    requests: 5,
    window: '1m',
    identifier: 'user',
    scope: 'finalizeMemory',
  },
  // GET endpoints are cheaper
  get: {
    requests: 100,
    window: '1m',
    identifier: 'ip',
    scope: 'get',
  },
} as const satisfies Record<string, RateLimitConfig>;

let redis: Redis | null = null;
const rateLimiters: Map<string, Ratelimit> = new Map();

// --- helpers ---------------------------------------------------------------

function parseWindowToMs(w: string): number {
  const m = /^(\d+)\s*(ms|s|m|h|d)?$/i.exec(w.trim());
  if (!m) throw new Error(`Invalid window: ${w}`);
  const n = Number(m[1]);
  const unit = (m[2] || 's').toLowerCase();
  switch (unit) {
    case 'ms': return n;
    case 's': return n * 1000;
    case 'm': return n * 60_000;
    case 'h': return n * 3_600_000;
    case 'd': return n * 86_400_000;
    default: throw new Error(`Unsupported unit in window: ${w}`);
  }
}

function policyString(cfg: RateLimitConfig): string {
  const windowSec = Math.round(parseWindowToMs(cfg.window) / 1000);
  const scope = cfg.scope ?? 'global';
  return `${cfg.identifier};w=${windowSec};scope=${scope}`;
}

async function sha256Hex(input: string): Promise<string> {
  try {
    const bytes = new TextEncoder().encode(input);
    const digest =
      (await (globalThis.crypto as any)?.subtle?.digest?.('SHA-256', bytes)) ??
      null;
    if (digest) {
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // fall through to plain input below
  }
  // Fallback: return raw input (still functional, less private)
  return input;
}

function getClientIp(request: Request): string {
  // prefer standardized / common proxy headers
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

function getLimiterKey(cfg: RateLimitConfig): string {
  const scope = cfg.scope ?? 'global';
  return `${scope}:${cfg.requests}_${cfg.window}_${cfg.identifier}`;
}

/** Get or create a rate limiter instance */
function getRateLimiter(config: RateLimitConfig): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('Rate limiting disabled: Upstash Redis not configured');
    return null;
  }
  const key = getLimiterKey(config);
  if (!rateLimiters.has(key)) {
    if (!redis) {
      redis = Redis.fromEnv();
    }
    const prefix = `seneca:ratelimit:${config.scope ?? 'global'}:${config.identifier}`;
    const limiter = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(config.requests, config.window as Duration),
      analytics: true,
      prefix,
    });
    rateLimiters.set(key, limiter);
  }
  return rateLimiters.get(key)!;
}

/** Extract identifier from request (with optional IP hashing) */
async function getIdentifier(
  request: Request,
  type: RateLimitConfig['identifier'],
  userId?: string,
  hashIp: boolean = true
): Promise<string> {
  const ipRaw = getClientIp(request);
  const ip = hashIp && ipRaw !== 'unknown' ? await sha256Hex(ipRaw) : ipRaw;

  switch (type) {
    case 'ip':
      return ip;
    case 'user':
      if (!userId) {
        throw new APIException(
          ErrorCode.UNAUTHORIZED,
          'User authentication required for this endpoint'
        );
      }
      return userId;
    case 'ip_and_user':
      return userId ? `${ip}:${userId}` : ip; // degrade to IP if unauthenticated
    default:
      return ip;
  }
}

// --- public API ------------------------------------------------------------

/**
 * Check and enforce the rate limit.
 * Returns headers to attach to your response. Throws APIException(429) when limited.
 */
export async function checkRateLimit(
  request: Request,
  config: RateLimitConfig = RATE_LIMIT_CONFIGS.post,
  userId?: string
): Promise<RateLimitHeaders> {
  const limiter = getRateLimiter(config);

  // If rate limiting is not configured, return a disabled policy
  if (!limiter) {
    return {
      'X-RateLimit-Limit': '0',
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': '0',
      'X-RateLimit-Policy': 'disabled',
      // Provide standardized keys but zeroed-out
      'RateLimit-Limit': '0',
      'RateLimit-Remaining': '0',
      'RateLimit-Reset': '0',
    };
  }

  const identifier = await getIdentifier(request, config.identifier, userId, config.hashIp ?? true);
  const result = await limiter.limit(identifier);

  const nowMs = Date.now();
  const resetMs = result.reset;
  const resetEpochSeconds = Math.ceil(resetMs / 1000);
  const deltaSeconds = Math.max(0, Math.ceil((resetMs - nowMs) / 1000));
  const windowSec = Math.round(parseWindowToMs(config.window) / 1000);

  const headers: RateLimitHeaders = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': resetEpochSeconds.toString(), // epoch seconds
    'X-RateLimit-Policy': policyString(config),

    // Standardized (RFC 9239): delta seconds in current window
    'RateLimit-Limit': `${result.limit}`,
    'RateLimit-Remaining': `${result.remaining}`,
    'RateLimit-Reset': `${deltaSeconds}`, // seconds until reset
  };

  if (!result.success) {
    // Include useful metadata for callers/logs
    throw new APIException(
      ErrorCode.RATE_LIMITED,
      'Too many requests. Please try again later.',
      {
        limit: result.limit,
        remaining: 0,
        reset_epoch: resetEpochSeconds,
        reset_in_seconds: deltaSeconds,
        window_seconds: windowSec,
        identifier_type: config.identifier,
        scope: config.scope ?? 'global',
      },
      429
    );
  }

  return headers;
}

/**
 * Convenience wrapper for route usage.
 * Example:
 *   const rateHeaders = await withRateLimit(RATE_LIMIT_CONFIGS.createMemory)(req, userId)
 *   return jsonResponse(resPayload, { headers: rateHeaders })
 */
export function withRateLimit(config: RateLimitConfig = RATE_LIMIT_CONFIGS.post) {
  return async (request: Request, userId?: string): Promise<RateLimitHeaders> => {
    return checkRateLimit(request, config, userId);
  };
}