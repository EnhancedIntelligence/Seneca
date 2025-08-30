import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Force Node.js runtime to avoid Edge + Supabase issues
export const runtime = "nodejs";

// Type definitions for Supabase version compatibility
type AuthErrorLike = { 
  message: string; 
  name?: string; 
  status?: number;
};

type ExchangeResult = { 
  error: AuthErrorLike | null;
  data?: { session?: unknown };
};

// Support multiple Supabase auth signatures
type ExchangeWithString = (code: string) => Promise<ExchangeResult>;
type ExchangeWithObject = (params: { code: string }) => Promise<ExchangeResult>;
type ExchangeNoArg = () => Promise<ExchangeResult>;

/**
 * Sanitizes redirect paths to prevent open redirects
 * Only allows same-origin relative paths
 */
function sanitizeNext(next: string, req: NextRequest): string {
  try {
    const u = new URL(next, req.url);
    return u.origin === new URL(req.url).origin
      ? u.pathname + u.search + u.hash
      : "/";
  } catch {
    return "/";
  }
}

/**
 * Auth Callback Route
 * Handles OAuth and magic link code exchange for session establishment
 * Supports multiple Supabase client versions
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const rawNext = url.searchParams.get("next") ?? "/";

  // Decode the next parameter (it was encoded by the client)
  const decodedNext = (() => {
    try {
      return decodeURIComponent(rawNext);
    } catch {
      return "/";
    }
  })();

  const safe = sanitizeNext(decodedNext, req);

  // Handle provider errors (OAuth denials, etc.)
  const providerError =
    url.searchParams.get("error") || url.searchParams.get("error_description");
  const code = url.searchParams.get("code") ?? "";

  if (!code && providerError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(providerError)}`, req.url),
    );
  }

  if (!code && !providerError) {
    return NextResponse.redirect(
      new URL("/login?error=No%20code%20provided", req.url),
    );
  }

  try {
    const supabase = await createClient();

    // Robust version compatibility with try/fallback pattern
    const auth = supabase.auth;
    const exchange = auth.exchangeCodeForSession.bind(auth) as unknown;
    
    async function exchangeCodeForSessionCompat(authCode: string): Promise<ExchangeResult> {
      // Try common Supabase signatures in order of likelihood
      
      // 1. Try with string argument (most common)
      try {
        return await (exchange as ExchangeWithString)(authCode);
      } catch {
        // Continue to next signature
      }
      
      // 2. Try with object argument (some versions)
      try {
        return await (exchange as ExchangeWithObject)({ code: authCode });
      } catch {
        // Continue to next signature
      }
      
      // 3. Try with no argument (reads from URL internally)
      try {
        return await (exchange as ExchangeNoArg)();
      } catch (_e) {
        // All signatures failed - return normalized error
        return {
          error: {
            message: _e instanceof Error ? _e.message : "Failed to exchange code for session",
            name: "ExchangeError"
          }
        };
      }
    }

    const { error } = await exchangeCodeForSessionCompat(code);

    if (error) {
      console.error("Auth callback error:", error);
      const msg = encodeURIComponent(error.message || "Authentication failed");
      return NextResponse.redirect(new URL(`/login?error=${msg}`, req.url));
    }

    // Verify session was created
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      console.error("No session after code exchange");
      return NextResponse.redirect(
        new URL("/login?error=Session%20creation%20failed", req.url),
      );
    }

    return NextResponse.redirect(new URL(safe, req.url));
  } catch (err) {
    // Guard against unexpected throws
    console.error("Unexpected error in auth callback:", err);
    return NextResponse.redirect(
      new URL("/login?error=An%20unexpected%20error%20occurred", req.url),
    );
  }
}
