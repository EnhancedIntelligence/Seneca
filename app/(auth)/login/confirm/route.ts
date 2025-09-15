import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pass-through route to maintain compatibility with old magic links
export async function GET(request: NextRequest) {
  const { origin } = request.nextUrl;
  const queryString = request.nextUrl.search; // Preserves ?token_hash=...&type=...&next=...
  const callbackUrl = new URL("/auth/callback", origin);

  // Preserve exact query string (encoding, duplicates, order)
  if (queryString) {
    callbackUrl.search = queryString;
  }

  // 307 for explicit method preservation, no-store to prevent caching
  const response = NextResponse.redirect(callbackUrl, 307);
  response.headers.set("Cache-Control", "no-store");

  return response;
}
