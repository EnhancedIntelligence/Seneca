// test/server/rate-limit-policies.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  rateLimitUsernameCheck,
  rateLimitOnboardingComplete,
} from '@/lib/server/rate-limit-policies';

// Mock the middleware function
vi.mock('@/lib/server/middleware/rate-limit', () => ({
  checkRateLimit: vi.fn(),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn((key: string) => {
      if (key === 'x-forwarded-for') return '192.168.1.1';
      if (key === 'x-real-ip') return '192.168.1.1';
      return null;
    }),
  })),
}));

describe('rate-limit-policies', () => {
  let mockCheckRateLimit: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Get the mocked function
    const { checkRateLimit } = await import('@/lib/server/middleware/rate-limit');
    mockCheckRateLimit = vi.mocked(checkRateLimit);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function callsContainKey(substr: string) {
    const keys = mockCheckRateLimit.mock.calls.map((args) => args[0] as string);
    return keys.some((k) => typeof k === 'string' && k.includes(substr));
  }

  describe('rateLimitUsernameCheck', () => {
    it('allows requests under the threshold and checks both user and IP', async () => {
      // Mock successful rate limit checks
      mockCheckRateLimit.mockResolvedValue(undefined);

      await expect(rateLimitUsernameCheck('user123')).resolves.not.toThrow();

      // Should check both user and IP
      expect(mockCheckRateLimit).toHaveBeenCalledTimes(2);
      expect(callsContainKey('user123')).toBe(true);
      expect(callsContainKey('192.168.1.1')).toBe(true);

      // Ensure distinct keys (user + ip, not the same key twice)
      const keys = mockCheckRateLimit.mock.calls.map((args) => String(args[0]));
      expect(new Set(keys).size).toBe(2);
    });

    it('throws when rate limit check throws', async () => {
      // Mock rate limit error
      mockCheckRateLimit.mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(rateLimitUsernameCheck('user123')).rejects.toThrow('Rate limit exceeded');

      // Should have attempted the first check
      expect(mockCheckRateLimit).toHaveBeenCalledTimes(1);
    });

    it('handles missing IP address gracefully (falls back to "unknown")', async () => {
      const { headers } = await import('next/headers');
      vi.mocked(headers).mockImplementationOnce(() => ({ get: vi.fn(() => null) } as any));

      mockCheckRateLimit.mockResolvedValue(undefined);

      await expect(rateLimitUsernameCheck('user123')).resolves.not.toThrow();

      // Should only check user since IP is unknown
      expect(mockCheckRateLimit).toHaveBeenCalledTimes(1);
      expect(callsContainKey('user123')).toBe(true);
      // Should not check IP when it's unknown
      const keys = mockCheckRateLimit.mock.calls.map((args) => String(args[0]));
      expect(keys.some(k => k.includes('unknown'))).toBe(false);
    });

    it('uses first IP from x-forwarded-for list', async () => {
      const { headers } = await import('next/headers');
      vi.mocked(headers).mockImplementationOnce(() => ({
        get: vi.fn((key: string) =>
          key === 'x-forwarded-for' ? '203.0.113.2, 10.0.0.1' : null
        ),
      } as any));

      mockCheckRateLimit.mockResolvedValue(undefined);

      await expect(rateLimitUsernameCheck('user-list')).resolves.not.toThrow();

      const keys = mockCheckRateLimit.mock.calls.map((args) => String(args[0]));
      expect(keys.some((k) => k.includes('203.0.113.2'))).toBe(true);
      // Ensure only the first IP was used (not the second)
      expect(keys.some((k) => k.includes('10.0.0.1'))).toBe(false);
    });

    it('falls back to x-real-ip when x-forwarded-for is missing', async () => {
      const { headers } = await import('next/headers');
      vi.mocked(headers).mockImplementationOnce(() => ({
        get: vi.fn((key: string) =>
          key === 'x-real-ip' ? '203.0.113.9' : null
        ),
      } as any));

      mockCheckRateLimit.mockResolvedValue(undefined);

      await expect(rateLimitUsernameCheck('user-real')).resolves.not.toThrow();

      const keys = mockCheckRateLimit.mock.calls.map((args) => String(args[0]));
      expect(keys.some((k) => k.includes('203.0.113.9'))).toBe(true);
    });
  });

  describe('rateLimitOnboardingComplete', () => {
    it('allows requests under the threshold and checks both user and IP', async () => {
      mockCheckRateLimit.mockResolvedValue(undefined);

      await expect(rateLimitOnboardingComplete('user456')).resolves.not.toThrow();

      expect(mockCheckRateLimit).toHaveBeenCalledTimes(2);
      expect(callsContainKey('user456')).toBe(true);
      expect(callsContainKey('192.168.1.1')).toBe(true);

      // Ensure distinct keys
      const keys = mockCheckRateLimit.mock.calls.map((args) => String(args[0]));
      expect(new Set(keys).size).toBe(2);
    });

    it('throws when rate limit check throws', async () => {
      mockCheckRateLimit.mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(rateLimitOnboardingComplete('user456')).rejects.toThrow('Rate limit exceeded');

      expect(mockCheckRateLimit).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('propagates rate limiter errors', async () => {
      mockCheckRateLimit.mockRejectedValue(new Error('Redis connection failed'));

      await expect(rateLimitUsernameCheck('user123')).rejects.toThrow('Redis connection failed');
    });

    it('handles undefined user ID (runtime) without crashing', async () => {
      mockCheckRateLimit.mockResolvedValue(undefined);

      // Runtime behavior only; TS would normally prevent this
      await expect(rateLimitUsernameCheck(undefined as any)).resolves.not.toThrow();

      const keys = mockCheckRateLimit.mock.calls.map((args) => args[0] as string);
      expect(keys.some((k) => typeof k === 'string' && k.includes('undefined'))).toBe(true);
    });
  });

  describe('policy sanity (behavioral)', () => {
    it('each limiter performs two checks (user + ip) when IP is available', async () => {
      mockCheckRateLimit.mockResolvedValue(undefined);

      await expect(rateLimitUsernameCheck('u1')).resolves.not.toThrow();
      expect(mockCheckRateLimit).toHaveBeenCalledTimes(2);

      vi.clearAllMocks();

      await expect(rateLimitOnboardingComplete('u2')).resolves.not.toThrow();
      expect(mockCheckRateLimit).toHaveBeenCalledTimes(2);
    });

    it('uses appropriate key prefixes for different operations', async () => {
      mockCheckRateLimit.mockResolvedValue(undefined);

      await rateLimitUsernameCheck('user1');
      const usernameKeys = mockCheckRateLimit.mock.calls.map((args) => String(args[0]));
      expect(usernameKeys.some(k => k.includes('username_check'))).toBe(true);

      vi.clearAllMocks();

      await rateLimitOnboardingComplete('user2');
      const onboardingKeys = mockCheckRateLimit.mock.calls.map((args) => String(args[0]));
      expect(onboardingKeys.some(k => k.includes('onboarding_complete'))).toBe(true);
    });
  });
});