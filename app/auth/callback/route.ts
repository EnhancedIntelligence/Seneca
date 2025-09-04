import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

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

/** Only allow single-leading-slash relative paths. */
function sanitizeNext(next: string | null): string {
  if (!next) return "/overview";
  // allow a single leading slash only; blocks '//' protocol-relative and externals
  return /^\/(?!\/)/.test(next) ? next : "/overview";
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
 * Unified Auth Callback Route
 * - OAuth: /auth/callback?code=XXX&next=/dashboard
 * - Magic: /auth/callback?token_hash=XXX&type=email&next=/dashboard
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // Decode next BEFORE sanitizing
  const nextParam = url.searchParams.get("next");
  const decodedNext = (() => {
    try { return nextParam ? decodeURIComponent(nextParam) : null; }
    catch { return null; }
  })();
  const next = sanitizeNext(decodedNext);

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
      
      return NextResponse.redirect(new URL(next, url.origin));
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
      
      return NextResponse.redirect(new URL(next, url.origin));
    } catch (err) {
      /* eslint-disable-next-line no-console */
      console.error("OTP verification error:", err);
      return NextResponse.redirect(new URL("/login?error=Verification%20failed", url.origin));
    }
  }

  // No valid auth parameters
  return NextResponse.redirect(new URL("/login?error=Invalid%20authentication%20link", url.origin));
}