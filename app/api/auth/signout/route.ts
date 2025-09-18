import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const APP_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000";

/**
 * POST /api/auth/signout
 *
 * Securely signs out the user:
 * - Uses anon key (never service role) for security
 * - Clears Supabase auth session cookies server-side
 * - POST only (prevents accidental CSRF via GET)
 * - Origin validation for defense-in-depth
 * - No-cache headers to prevent stale auth state
 */
export async function POST(req: Request) {
  try {
    // CSRF guard: enforce same-origin POSTs (defense-in-depth)
    const origin = req.headers.get("origin") || "";
    const referer = req.headers.get("referer") || "";

    if (origin || referer) {
      const requestOrigin = origin || new URL(referer).origin;
      const appOrigin = new URL(APP_ORIGIN).origin;

      if (requestOrigin !== appOrigin) {
        console.warn(`Signout rejected from origin: ${requestOrigin}`);
        return NextResponse.json(
          { error: "Invalid origin" },
          { status: 400 }
        );
      }
    }

    const cookieStore = cookies(); // synchronous in route handlers

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // anon only, never service role
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options) => {
            cookieStore.set({ name, value, path: "/", ...options });
          },
          remove: (name: string, options) => {
            cookieStore.set({
              name,
              value: "",
              path: "/",
              maxAge: 0,
              ...options
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Signout error:", error);
      const res = NextResponse.json(
        { error: "Failed to sign out" },
        { status: 500 }
      );
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    const res = NextResponse.json({ success: true }, { status: 200 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error) {
    console.error("Signout error:", error);
    const res = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
}

// Explicitly reject GET to avoid accidental CSRF via image tags, etc.
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST for logout." },
    { status: 405 }
  );
}

// OPTIONS for CORS/preflight support
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}