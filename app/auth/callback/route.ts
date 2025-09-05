import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
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

/** Only allow same-origin relative paths and prevent redirect loops/odd UX. */
function sanitizeNext(nextParam: string | null | undefined): string {
  const SAFE = "/overview";
  if (!nextParam) return SAFE;

  // Trim & cap length
  const raw = nextParam.trim();
  if (raw.length === 0 || raw.length > 2048) return SAFE;

  try {
    // Only allow same-origin relative paths
    const u = new URL(raw, "http://local");
    if (u.origin !== "http://local") return SAFE;
    if (!u.pathname.startsWith("/")) return SAFE;

    // Block problematic prefixes (loops/internal)
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
    if (blockedPrefixes.some(p => u.pathname === p || u.pathname.startsWith(p + "/"))) {
      return SAFE;
    }

    // Normalize trailing slashes  
    const path = u.pathname.replace(/\/+$/, "") || SAFE;
    return path + (u.search || "") + (u.hash || "");
  } catch {
    return SAFE;
  }
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
 */
async function redirectAfterAuth(
  supabase: SupabaseClient<Database>,
  userId: string,
  url: URL,
  nextParam: string | null
): Promise<NextResponse> {
  const onboardingEnabled = process.env.SENECA_ONBOARDING_V1 === "true";

  // Always sanitize next; safe default already set to "/overview"
  const safeNext = sanitizeNext(nextParam);

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
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // Decode next parameter for later use
  const nextParam = url.searchParams.get("next");
  const decodedNext = (() => {
    try { return nextParam ? decodeURIComponent(nextParam) : null; }
    catch { return null; }
  })();

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // Provider error (e.g., user denied OAuth)
  if (error && !code && !tokenHash) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, url.origin)
    );
  }

  const supabase = await createClient();

  // OAuth flow
  if (code) {
    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(exchangeError.message ?? "Authentication failed")}`, url.origin)
        );
      }
      
      // Verify session was created
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return NextResponse.redirect(new URL("/login?error=Session%20creation%20failed", url.origin));
      }
      
      // Handle post-auth redirect with onboarding check
      return redirectAfterAuth(supabase, session.user.id, url, decodedNext);
    } catch {
      return NextResponse.redirect(new URL("/login?error=Authentication%20failed", url.origin));
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
        return NextResponse.redirect(new URL(`/login?error=${msg}`, url.origin));
      }
      
      // Verify session was created
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return NextResponse.redirect(new URL("/login?error=Session%20creation%20failed", url.origin));
      }
      
      // Handle post-auth redirect with onboarding check
      return redirectAfterAuth(supabase, session.user.id, url, decodedNext);
    } catch (err) {
      /* eslint-disable-next-line no-console */
      console.error("OTP verification error:", err);
      return NextResponse.redirect(new URL("/login?error=Verification%20failed", url.origin));
    }
  }

  // No valid auth parameters
  return NextResponse.redirect(new URL("/login?error=Invalid%20authentication%20link", url.origin));
}