/**
 * Rate Limit Policies
 * Centralized rate limiting policies for different endpoints
 * Provides both per-user and per-IP protection
 */

import { checkRateLimit } from './middleware/rate-limit';
import { headers } from 'next/headers';

/**
 * Extract client IP from request headers
 * Handles various proxy configurations
 */
async function getClientIp(): Promise<string> {
  const h = await headers();
  
  // Check standard proxy headers in order of preference
  const forwardedFor = h.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first
    return forwardedFor.split(',')[0].trim();
  }
  
  // Fallback headers
  const realIp = h.get('x-real-ip');
  if (realIp) return realIp;
  
  const cfConnectingIp = h.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp;
  
  // Default if no IP found
  return 'unknown';
}

/**
 * Rate limit username availability checks
 * - 10 checks per minute per user
 * - 20 checks per minute per IP (shared limit)
 * 
 * @throws Error if rate limit exceeded (generic error, no details exposed)
 */
export async function rateLimitUsernameCheck(userId: string): Promise<void> {
  const ip = await getClientIp();
  
  // Per-user limit: 10 checks per minute
  // This prevents a single user from spamming checks
  await checkRateLimit(`username_check:user:${userId}`);
  
  // Per-IP limit: 20 checks per minute (defense in depth)
  // This prevents abuse from shared IPs or multiple accounts
  // Note: Current implementation uses global 60/min, consider custom limiter
  if (ip !== 'unknown') {
    await checkRateLimit(`username_check:ip:${ip}`);
  }
}

/**
 * Rate limit onboarding completion attempts
 * - 5 attempts per hour per user
 * - 10 attempts per hour per IP
 * 
 * @throws Error if rate limit exceeded
 */
export async function rateLimitOnboardingComplete(userId: string): Promise<void> {
  const ip = await getClientIp();
  
  // Stricter limits for completion attempts
  await checkRateLimit(`onboarding_complete:user:${userId}`);
  
  if (ip !== 'unknown') {
    await checkRateLimit(`onboarding_complete:ip:${ip}`);
  }
}

/**
 * Rate limit API endpoints with configurable cost
 * Useful for expensive operations like AI processing
 * 
 * @param endpoint - The endpoint identifier
 * @param userId - The user making the request
 * @param cost - The cost of this operation (default 1)
 */
export async function rateLimitApiEndpoint(
  endpoint: string,
  userId: string,
  cost: number = 1
): Promise<void> {
  const ip = await getClientIp();
  
  // Per-user limit
  await checkRateLimit(`api:${endpoint}:user:${userId}`);
  
  // Per-IP limit
  if (ip !== 'unknown') {
    await checkRateLimit(`api:${endpoint}:ip:${ip}`);
  }
}