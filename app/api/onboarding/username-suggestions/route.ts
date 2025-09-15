import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { rateLimitUsernameCheck } from '@/lib/server/rate-limit-policies';
import { USERNAME_REGEX } from '@/lib/validation/onboarding';
import { suggestUsernames } from '@/lib/utils/username-suggestions';
import { createLogger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const log = createLogger({ where: 'api.username-suggestions' });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  // Support both ?q and ?name to avoid breaking callers; prefer q
  const raw = (searchParams.get('q') ?? searchParams.get('name') ?? '').trim();

  if (!raw || raw.length < 2) {
    return NextResponse.json(
      { available: false, suggestions: [] },
      { 
        status: 200, 
        headers: { 
          'Cache-Control': 'no-store',
          'Vary': 'Cookie',
        } 
      },
    );
  }

  const base = raw.toLowerCase();
  const isBaseCandidate = USERNAME_REGEX.test(base);
  const supabase = await createClient();

  // Identify user (optional), limiter handles IP internally
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id ?? 'anon';

  try {
    await rateLimitUsernameCheck(userId);
  } catch {
    log.warn('Rate limit exceeded for username suggestions', { userId });
    return NextResponse.json(
      { available: false, suggestions: [] },
      {
        status: 429,
        headers: { 
          'Cache-Control': 'no-store', 
          'Retry-After': '60',
          'Vary': 'Cookie',
        },
      },
    );
  }

  // Check availability for the base candidate (so UI can render state cleanly)
  let available = false;
  if (isBaseCandidate) {
    try {
      const { data, error } = await supabase.rpc('check_username_availability', {
        p_username: base,
      });
      // Type guard for RPC response
      const result = data as { available: boolean } | null;
      available = !error && Boolean(result?.available);
    } catch {
      available = false;
    }
  }

  // Generate, normalize, and dedupe candidates
  const rawCandidates = suggestUsernames(base);
  const seen = new Set<string>();
  const candidates = rawCandidates
    .map((c) => c.toLowerCase())
    .filter((c) => {
      if (!USERNAME_REGEX.test(c)) return false;
      if (c === base) return false; // Don't suggest the current input
      if (seen.has(c)) return false;
      seen.add(c);
      return true;
    });

  // Probe availability until we have 5
  const suggestions: string[] = [];
  const MAX_PROBES = 25; // hard cap for N+1 safety
  
  for (const candidate of candidates.slice(0, MAX_PROBES)) {
    try {
      const { data, error } = await supabase.rpc('check_username_availability', {
        p_username: candidate,
      });
      // Type guard for RPC response
      const result = data as { available: boolean } | null;
      if (!error && result?.available) {
        suggestions.push(candidate);
        if (suggestions.length >= 5) break;
      }
    } catch {
      // ignore transient error and continue
    }
  }

  log.info('Generated username suggestions', {
    base: base.slice(0, Math.min(3, base.length)) + '***', // safe mask
    suggestionsCount: suggestions.length,
  });

  return NextResponse.json(
    { available, suggestions },
    { 
      status: 200, 
      headers: { 
        'Cache-Control': 'no-store',
        'Vary': 'Cookie',
      } 
    },
  );
}