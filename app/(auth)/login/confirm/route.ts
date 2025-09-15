import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pass-through route to maintain compatibility with old magic links
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const qs = url.search; // preserves ?token_hash=...&type=...&next=...
  
  // Redirect to unified auth callback
  return NextResponse.redirect(new URL(`/auth/callback${qs}`, url.origin));
}
