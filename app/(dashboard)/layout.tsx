/**
 * Dashboard Layout
 *
 * Wraps all dashboard routes with authentication AND subscription protection.
 * Uses server-side initial check + client-side auth provider for:
 * - Session verification without middleware
 * - Subscription status verification
 * - Automatic redirect to login if not authenticated
 * - Automatic redirect to billing if not subscribed
 * - Session verification without middleware
 * - Real-time session monitoring
 */

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { protectRoute } from "@/lib/server/subscription";
import { AuthError, ForbiddenError } from "@/lib/server/errors";
import { createLogger, hashId } from "@/lib/logger";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardAuthProvider } from "@/components/auth/DashboardAuthProviderV2";

const log = createLogger({ where: "dashboard.layout" });

// Force Node.js runtime to avoid Edge + Supabase issues
export const runtime = "nodejs";
// Force dynamic rendering to avoid caching issues with auth
export const dynamic = "force-dynamic";
// Prevent caching of subscription state
export const revalidate = 0;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    // Feature flag for safe rollout
    const onboardingEnabled = process.env.SENECA_ONBOARDING_V1 === "true";

    if (onboardingEnabled) {
      // Get authenticated user first
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return redirect("/login");
      }

      // Check onboarding FIRST (narrow select)
      const { data: member, error } = await supabase
        .from("members")
        .select("onboarding_completed_at")
        .eq("id", user.id)
        .maybeSingle();

      if (error || !member?.onboarding_completed_at) {
        log.warn("Onboarding incomplete", {
          userIdHash: await hashId(user.id),
        });
        return redirect("/onboarding");
      }
    }

    // Then check authentication and subscription (reuse existing logic)
    // protectRoute() checks:
    // 1. User is authenticated (has valid session)
    // 2. User has active subscription (not expired)
    // 3. User has required tier (defaults to basic/premium)
    await protectRoute();
  } catch (err: unknown) {
    // Use instanceof for type-safe error checking
    if (err instanceof AuthError) {
      return redirect("/login");
    }
    if (err instanceof ForbiddenError) {
      return redirect("/billing");
    }
    // Unknown error -> safe fallback to login
    log.error(err);
    return redirect("/login");
  }

  // All checks passed - render dashboard with providers
  // The DashboardAuthProvider will:
  // - Monitor session changes
  // - Handle token refresh
  // - Redirect on sign out
  // - Provide user context to all dashboard pages
  return (
    <DashboardAuthProvider>
      <AppShell>{children}</AppShell>
    </DashboardAuthProvider>
  );
}
