/**
 * Test Route: Premium Tier Gating
 * Used to verify tier-based access control
 */

import { ok, err } from "@/lib/server/api";
import { requireSubscription } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/test-premium
 * Requires premium tier subscription
 */
export async function GET(request: Request) {
  try {
    // Require premium tier only
    const user = await requireSubscription(request, ["premium"]);

    const res = ok({
      message: "Premium access granted",
      userId: user.id,
      requiredTier: "premium",
    });
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("Vary", "Cookie");
    return res;
  } catch (error) {
    return err(error);
  }
}
