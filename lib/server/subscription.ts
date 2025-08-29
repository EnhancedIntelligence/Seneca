/**
 * Subscription Management Helper
 * Checks user subscription status for dashboard access control
 * Server-only module - not bundled for client
 */

import "server-only";
import { createClient } from "@/utils/supabase/server";
import { AuthError, ForbiddenError } from "@/lib/server/errors";
import type { User } from "@supabase/supabase-js";

// Configuration constants - easy to change if we move to family-level billing
export const SUBSCRIPTION_TABLE = "members" as const;

// Locked column map with strict typing
export const SUBSCRIPTION_COLUMNS = {
  active: "active_subscription",
  tier: "subscription_tier",
  expiresAt: "subscription_expires_at",
} as const satisfies Readonly<Record<"active" | "tier" | "expiresAt", string>>;

// Type definitions
export type SubscriptionTier = "free" | "basic" | "premium";

export type SubscriptionInfo = {
  active: boolean;
  tier: SubscriptionTier;
  expiresAt: string | null;
};

export type AuthResult = {
  user: User | null;
  hasAccess: boolean;
  subscription: SubscriptionInfo | null;
};

/**
 * Check authentication and subscription status
 * Used by dashboard layout and client status checks
 * @returns User, access status, and subscription details
 */
export async function requireAuth(): Promise<AuthResult> {
  try {
    const supabase = await createClient();

    // Get current session from cookies
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      // Log session errors (but not missing sessions which are normal)
      console.error("[AUTH] Session retrieval error:", {
        error: sessionError.message,
        timestamp: new Date().toISOString(),
      });
    }

    if (!session?.user) {
      // No session = not authenticated (normal case, no error log)
      return {
        user: null,
        hasAccess: false,
        subscription: null,
      };
    }

    // Fetch subscription data from members table
    const { data: member, error: memberError } = await supabase
      .from(SUBSCRIPTION_TABLE)
      .select(
        `
        ${SUBSCRIPTION_COLUMNS.active},
        ${SUBSCRIPTION_COLUMNS.tier},
        ${SUBSCRIPTION_COLUMNS.expiresAt}
      `,
      )
      .eq("id", session.user.id)
      .single();

    if (memberError || !member) {
      // User exists but no member row or fetch error
      // This shouldn't happen with our trigger, but fail closed
      console.error("[AUTH] Member subscription fetch error:", {
        userId: session.user.id,
        error: memberError?.message || "No member record found",
        timestamp: new Date().toISOString(),
        table: SUBSCRIPTION_TABLE,
      });

      return {
        user: session.user,
        hasAccess: false,
        subscription: null,
      };
    }

    // Check if subscription is active and not expired
    const expiresAt = member[SUBSCRIPTION_COLUMNS.expiresAt] as string | null;
    const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
    const isActive = Boolean(member[SUBSCRIPTION_COLUMNS.active]) && !isExpired;

    return {
      user: session.user,
      hasAccess: isActive,
      subscription: {
        active: isActive,
        tier: (member[SUBSCRIPTION_COLUMNS.tier] as SubscriptionTier) || "free",
        expiresAt: expiresAt ?? null,
      },
    };
  } catch (error) {
    // Log unexpected errors but fail closed
    console.error("[AUTH] Unexpected error in requireAuth:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    return {
      user: null,
      hasAccess: false,
      subscription: null,
    };
  }
}

/**
 * Protect routes with subscription requirements
 * Throws errors for unauthorized access (caller handles redirects)
 * @param allowedTiers - Array of allowed subscription tiers (immutable)
 * @returns Authenticated user if all checks pass
 * @throws AuthError if not authenticated
 * @throws ForbiddenError if subscription requirements not met
 */
export async function protectRoute(
  allowedTiers: ReadonlyArray<SubscriptionTier> = ["basic", "premium"],
): Promise<User> {
  const { user, hasAccess, subscription } = await requireAuth();

  // Not authenticated
  if (!user) {
    throw new AuthError("Authentication required");
  }

  // No active subscription
  if (!hasAccess) {
    throw new ForbiddenError("Active subscription required");
  }

  // Check tier requirements if specified
  if (allowedTiers.length > 0) {
    const userTier = subscription?.tier ?? "free";
    if (!allowedTiers.includes(userTier)) {
      throw new ForbiddenError(
        `Subscription tier '${allowedTiers.join(" or ")}' required`,
      );
    }
  }

  return user;
}

/**
 * Check if a user has a specific subscription tier
 * Useful for feature gating within pages
 * @param tier - Required subscription tier
 * @returns Boolean indicating if user has required tier or higher
 */
export async function hasTier(tier: SubscriptionTier): Promise<boolean> {
  const { hasAccess, subscription } = await requireAuth();

  if (!hasAccess || !subscription) return false;

  // Define tier hierarchy (higher number = better tier)
  const tierHierarchy: Readonly<Record<SubscriptionTier, number>> = {
    free: 0,
    basic: 1,
    premium: 2,
  };

  const userTierLevel = tierHierarchy[subscription.tier] ?? 0;
  const requiredTierLevel = tierHierarchy[tier] ?? 0;

  // User tier must be equal or higher
  return userTierLevel >= requiredTierLevel;
}

/**
 * Get subscription status for client components
 * Safe to expose to client as it only returns non-sensitive data
 * Used by /api/auth/status endpoint
 */
export async function getSubscriptionStatus(): Promise<{
  authenticated: boolean;
  active: boolean;
  tier: SubscriptionTier;
  expiresAt: string | null;
}> {
  const { user, hasAccess, subscription } = await requireAuth();

  return {
    authenticated: !!user,
    active: hasAccess,
    tier: subscription?.tier ?? "free",
    expiresAt: subscription?.expiresAt ?? null,
  };
}
