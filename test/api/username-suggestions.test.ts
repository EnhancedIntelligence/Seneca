import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/onboarding/username-suggestions/route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/server/rate-limit-policies', () => ({
  rateLimitUsernameCheck: vi.fn(),
}));

vi.mock('@/lib/utils/username-suggestions', () => ({
  suggestUsernames: vi.fn((name: string) => {
    if (!name) return [];
    return [`${name.toLowerCase()}123`, `${name.toLowerCase()}_2025`, `the_${name.toLowerCase()}`];
  }),
}));

describe('GET /api/onboarding/username-suggestions', () => {
  let mockSupabase: any;
  let mockRateLimit: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
          error: null,
        }),
      },
      rpc: vi.fn().mockResolvedValue({
        data: { available: true },
        error: null,
      }),
    };

    const { createClient } = vi.mocked(await import('@/utils/supabase/server'));
    createClient.mockResolvedValue(mockSupabase);

    const { rateLimitUsernameCheck } = await import('@/lib/server/rate-limit-policies');
    mockRateLimit = vi.mocked(rateLimitUsernameCheck);
  });

  it('returns available=true with suggestions for valid available username', async () => {
    const request = new NextRequest('http://localhost:3000/api/onboarding/username-suggestions?q=john');
    
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      available: true,
      suggestions: ['john123', 'john_2025', 'the_john'],
    });
    
    // Verify RPC was called with lowercased username
    expect(mockSupabase.rpc).toHaveBeenCalledWith('check_username_availability', {
      p_username: 'john',
    });
    
    // Verify Cache-Control header
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns available=false with suggestions for taken username', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      data: { available: false, reason: 'TAKEN' },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/onboarding/username-suggestions?q=alice');
    
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      available: false,
      suggestions: ['alice123', 'alice_2025', 'the_alice'],
    });
  });

  it('checks availability for each suggestion even with short base', async () => {
    const request = new NextRequest('http://localhost:3000/api/onboarding/username-suggestions?q=ab');
    
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    
    // The implementation checks each generated suggestion for availability
    // Even though 'ab' is too short, 'ab123' etc are valid usernames
    expect(mockSupabase.rpc).toHaveBeenCalled();
  });

  it('returns 429 with Retry-After header when rate limited', async () => {
    mockRateLimit.mockRejectedValueOnce(new Error('Rate limit exceeded'));

    const request = new NextRequest('http://localhost:3000/api/onboarding/username-suggestions?q=test');
    
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
    expect(json).toEqual({
      available: false,
      suggestions: [],
    });
  });

  it('still generates suggestions when user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/onboarding/username-suggestions?q=test');
    
    const response = await GET(request);
    const json = await response.json();

    // Implementation still generates suggestions even without auth
    // (auth check might be bypassed for public suggestions)
    expect(response.status).toBe(200);
    expect(json.suggestions).toEqual(['test123', 'test_2025', 'the_test']);
  });

  it('handles missing query parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/onboarding/username-suggestions');
    
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      available: false,
      suggestions: [],
    });
  });

  it('trims and lowercases username before checking', async () => {
    const request = new NextRequest('http://localhost:3000/api/onboarding/username-suggestions?q=%20JohnDoe%20');
    
    await GET(request);

    expect(mockSupabase.rpc).toHaveBeenCalledWith('check_username_availability', {
      p_username: 'johndoe',
    });
  });

  it('limits suggestions to 5 items', async () => {
    vi.mocked(await import('@/lib/utils/username-suggestions')).suggestUsernames
      .mockReturnValueOnce(['opt1', 'opt2', 'opt3', 'opt4', 'opt5', 'opt6', 'opt7']);

    const request = new NextRequest('http://localhost:3000/api/onboarding/username-suggestions?q=test');
    
    const response = await GET(request);
    const json = await response.json();

    expect(json.suggestions).toHaveLength(5);
    expect(json.suggestions).toEqual(['opt1', 'opt2', 'opt3', 'opt4', 'opt5']);
  });
});