import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.generated";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Accept the common variants across Supabase versions
// Note: Some providers send "email", others send "magiclink" - both are allowed
const AllowedTypes = [
  "email",        // magic link often arrives as "email"
  "magiclink",    // alternative magic link type
  "signup",
  "recovery",
  "email_change",
] as const;
const allowed = new Set<string>(AllowedTypes);

const SAFE_DEFAULT = "/overview";

/** Only allow same-origin relative paths and prevent redirect loops/odd UX. */
function sanitizeNext(nextParam: string | null | undefined, baseUrl: URL): string {
  // 1) Fast exits + bounds
  if (!nextParam) return SAFE_DEFAULT;
  let raw = nextParam.trim();
  if (raw.length === 0 || raw.length > 1024) return SAFE_DEFAULT;

  // 2) Decode once to surface attempts like https%3A%2F%2Fevil.com or %2F%2Fevil.com
  try {
    raw = decodeURIComponent(raw);
  } catch {
    // if decode fails, fall back to SAFE
    return SAFE_DEFAULT;
  }

  // 3) Block control chars and backslashes
  if (/[\u0000-\u001F\u007F\\]/.test(raw)) return SAFE_DEFAULT;

  // 4) Block protocol-relative and absolute URLs (open redirect vectors)
  if (raw.startsWith("//")) return SAFE_DEFAULT;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return SAFE_DEFAULT;

  // 5) Build a URL against the current origin for robust origin checks
  let candidate: URL;
  try {
    candidate = new URL(raw, baseUrl);
  } catch {
    return SAFE_DEFAULT;
  }

  // 6) Enforce same-origin only
  if (candidate.origin !== baseUrl.origin) return SAFE_DEFAULT;

  // 7) Only allow root-relative paths
  const pathname = candidate.pathname.startsWith("/")
    ? candidate.pathname
    : `/${candidate.pathname}`;

  // 8) Block problematic prefixes (loops/internal)
  const blockedPrefixes = [
    "/onboarding",
    "/auth",
    "/login",
    "/logout",
    "/api",
    "/_next",
    "/static",
    "/images",
  ];

  if (blockedPrefixes.some(p => pathname === p || pathname.startsWith(p + "/"))) {
    return SAFE_DEFAULT;
  }

  // 9) Collapse multiple slashes for cleaner URLs
  const normPath = pathname.replace(/\/{2,}/g, '/');

  // 10) Return a clean relative path with query + hash, never echoing attacker input
  return `${normPath}${candidate.search}${candidate.hash}`;
}

/**
 * Compatibility wrapper for verifyOtp to handle SDK type variations
 * @param auth - Supabase auth client
 * @param params - OTP verification parameters
 */
function verifyOtpCompat(
  auth: SupabaseClient["auth"],
  params: { token_hash: string; type: string }
) {
  // @ts-expect-error — supabase-js@2.53.0 may not include "email" in the union;
  // runtime accepts it for magic links. Remove when SDK updates.
  return auth.verifyOtp(params);
}

/**
 * Handle post-authentication redirect with onboarding check
 * @param supabase - Authenticated Supabase client
 * @param userId - Authenticated user ID
 * @param url - Request URL for origin
 * @param nextParam - Requested redirect path (will be sanitized)
 * @param userEmail - User email for member ensure
 * @param userMetadata - User metadata for full name extraction
 */
async function redirectAfterAuth(
  supabase: SupabaseClient<Database>,
  userId: string,
  url: URL,
  nextParam: string | null,
  userEmail?: string | null,
  userMetadata?: User['user_metadata']
): Promise<NextResponse> {
  // First, ensure member record exists (safety net for trigger failures)
  try {
    const fullName = 
      userMetadata?.full_name ??
      userMetadata?.display_name ??
      (userEmail ? userEmail.split('@')[0] : null) ??
      `user_${userId.slice(0, 8)}`;

    await supabase.rpc('ensure_member', {
      p_id: userId,
      p_email: userEmail || undefined,
      p_full_name: fullName || undefined
    });
  } catch (err) {
    /* eslint-disable-next-line no-console -- non-PII RPC warning */
    console.warn('[AUTH_CALLBACK] ensure_member RPC failed:', err);
    // Continue anyway - the member might already exist
  }

  const onboardingEnabled = process.env.SENECA_ONBOARDING_V1 === "true";

  // Always sanitize next; safe default already set to "/overview"
  const safeNext = sanitizeNext(nextParam, url);

  // If feature is disabled, behave exactly like pre-onboarding
  if (!onboardingEnabled) {
    return NextResponse.redirect(new URL(safeNext, url.origin));
  }

  // Onboarding enabled → gate by completion
  const { data: member, error } = await supabase
    .from('members')
    .select('onboarding_completed_at')
    .eq('id', userId)
    .maybeSingle();

  /* eslint-disable-next-line no-console -- non-PII fetch warning */
  if (error) console.warn('[AUTH_CALLBACK] Member fetch error:', error?.code ?? error?.message);

  const done = !!member?.onboarding_completed_at;
  const redirectTo = done ? safeNext : '/onboarding';
  return NextResponse.redirect(new URL(redirectTo, url.origin));
}

/**
 * Unified Auth Callback Route
 * - OAuth: /auth/callback?code=XXX&next=/dashboard
 * - Magic: /auth/callback?token_hash=XXX&type=email&next=/dashboard
 *
 * Security: Uses sanitizeReturnTo to prevent open redirects
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // Get parameters
  const nextParam = url.searchParams.get("next");
  const code = url.searchParams.get("code");

  // For E2E testing: if code=test, immediately redirect with sanitized path
  // This allows testing the sanitization without real auth (dev only)
  if (code === 'test' && process.env.NODE_ENV !== 'production') {
    const target = sanitizeNext(nextParam, url);
    return NextResponse.redirect(new URL(target, url.origin), { status: 302 });
  }

  // Decode next parameter for later use in real auth flow
  const decodedNext = (() => {
    try { return nextParam ? decodeURIComponent(nextParam) : null; }
    catch { return null; }
  })();
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // Provider error (e.g., user denied OAuth)
  if (error && !code && !tokenHash) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, url.origin),
      { status: 302 }
    );
  }

  const supabase = await createClient();

  // OAuth flow
  if (code) {
    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(exchangeError.message ?? "Authentication failed")}`, url.origin),
          { status: 302 }
        );
      }
      
      // Verify session was created
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return NextResponse.redirect(new URL("/login?error=Session%20creation%20failed", url.origin), { status: 302 });
      }
      
      // Handle post-auth redirect with onboarding check
      return redirectAfterAuth(
        supabase,
        session.user.id,
        url,
        decodedNext,
        session.user.email ?? null,
        session.user.user_metadata ?? {}
      );
    } catch {
      return NextResponse.redirect(new URL("/login?error=Authentication%20failed", url.origin), { status: 302 });
    }
  }

  // Magic link / OTP flow (accepts both "email" and "magiclink")
  if (tokenHash && type && allowed.has(type)) {
    try {
      // Use computed key to avoid ESLint naming-convention warning
      const otpParams = { ["token_hash"]: tokenHash, type };
      const { error: otpError } = await verifyOtpCompat(supabase.auth, otpParams);
      if (otpError) {
        const msg =
          /rate|seconds/i.test(otpError.message ?? "")
            ? "Too%20many%20attempts.%20Please%20wait%2030%20seconds"
            : encodeURIComponent(otpError.message ?? "Verification failed");
        return NextResponse.redirect(new URL(`/login?error=${msg}`, url.origin), { status: 302 });
      }
      
      // Verify session was created
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return NextResponse.redirect(new URL("/login?error=Session%20creation%20failed", url.origin), { status: 302 });
      }
      
      // Handle post-auth redirect with onboarding check
      return redirectAfterAuth(
        supabase,
        session.user.id,
        url,
        decodedNext,
        session.user.email ?? null,
        session.user.user_metadata ?? {}
      );
    } catch (err) {
      /* eslint-disable-next-line no-console */
      console.error("OTP verification error:", err);
      return NextResponse.redirect(new URL("/login?error=Verification%20failed", url.origin), { status: 302 });
    }
  }

  // No valid auth parameters
  return NextResponse.redirect(new URL("/login?error=Invalid%20authentication%20link", url.origin), { status: 302 });
}

// Some IdPs POST to the callback
export const POST = GET;