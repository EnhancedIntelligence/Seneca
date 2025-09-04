/**
 * Development Subscription Management Endpoint
 * Allows manual subscription tier changes in development environment only
 * Used by the billing page to test subscription flows
 */

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/lib/server-only/admin-client";
import {
  SUBSCRIPTION_TABLE,
  SUBSCRIPTION_COLUMNS,
  type SubscriptionTier,
} from "@/lib/server/subscription";

// Force Node.js runtime for Supabase
export const runtime = "nodejs";
// Force dynamic rendering
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/dev-subscribe
 * Update user's subscription tier (development only)
 *
 * Request body:
 * - tier: 'free' | 'basic' | 'premium'
 *
 * Response:
 * - ok: boolean
 * - tier: string (the tier that was set)
 * - active: boolean (whether subscription is active)
 * - expiresAt: string | null (expiration date)
 * - message: string (confirmation message)
 */
export async function POST(req: Request) {
  try {
    // Security: Only allow on localhost (including IPv6, with optional port)
    const host = req.headers.get("host") ?? "";
    if (!/^(localhost|127\.0\.0\.1|::1)(:\d+)?$/.test(host)) {
      const errorResponse = NextResponse.json(
        { error: "This endpoint is only available in development" },
        { status: 403 },
      );
      errorResponse.headers.set("Cache-Control", "no-store");
      errorResponse.headers.set("Vary", "Cookie");
      return errorResponse;
    }

    // Parse and validate tier (normalize to lowercase)
    const body = await req.json().catch(() => ({}));
    const tier = String(body?.tier ?? "").toLowerCase();

    const validTiers: SubscriptionTier[] = ["free", "basic", "premium"];
    if (!validTiers.includes(tier as SubscriptionTier)) {
      const errorResponse = NextResponse.json(
        { error: "Invalid tier. Must be one of: free, basic, premium" },
        { status: 400 },
      );
      errorResponse.headers.set("Cache-Control", "no-store");
      errorResponse.headers.set("Vary", "Cookie");
      return errorResponse;
    }

    // Check authentication
    const supabase = await createClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      const errorResponse = NextResponse.json(
        { error: "You must be logged in to change subscription tier" },
        { status: 401 },
      );
      errorResponse.headers.set("Cache-Control", "no-store");
      errorResponse.headers.set("Vary", "Cookie");
      return errorResponse;
    }

    // Calculate expiration date (30 days for paid tiers, null for free)
    const expiresAt =
      tier === "free"
        ? null
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Update subscription using admin client (bypasses RLS)
    const admin = createAdminClient();
    const { error: updateError } = await admin
      .from(SUBSCRIPTION_TABLE)
      .update({
        [SUBSCRIPTION_COLUMNS.active]: tier !== "free",
        [SUBSCRIPTION_COLUMNS.tier]: tier as SubscriptionTier,
        [SUBSCRIPTION_COLUMNS.expiresAt]: expiresAt,
      })
      .eq("id", session.user.id);

    if (updateError) {
      console.error("[DEV_SUBSCRIBE] Update error:", updateError);
      const errorResponse = NextResponse.json(
        { error: `Failed to update subscription: ${updateError.message}` },
        { status: 500 },
      );
      errorResponse.headers.set("Cache-Control", "no-store");
      errorResponse.headers.set("Vary", "Cookie");
      return errorResponse;
    }

    // Log the change for debugging
    console.log("[DEV_SUBSCRIBE] Updated subscription:", {
      userId: session.user.id,
      email: session.user.email,
      tier,
      expiresAt,
    });

    // Return success response with full state (saves a follow-up status call)
    const response = NextResponse.json({
      ok: true,
      tier,
      active: tier !== "free",
      expiresAt,
      message: `Subscription updated to ${tier}`,
    });

    // Prevent caching
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Vary", "Cookie");

    return response;
  } catch (error) {
    console.error("[DEV_SUBSCRIBE] Unexpected error:", error);
    const errorResponse = NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
    errorResponse.headers.set("Cache-Control", "no-store");
    errorResponse.headers.set("Vary", "Cookie");
    return errorResponse;
  }
}
