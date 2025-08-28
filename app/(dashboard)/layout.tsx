/**
 * Dashboard Layout
 * 
 * Wraps all dashboard routes with authentication AND subscription protection.
 * Uses server-side initial check + client-side auth provider for:
 * - Session verification without middleware
 * - Subscription status verification
 * - Automatic redirect to login if not authenticated
 * - Automatic redirect to billing if not subscribed
 * - Real-time session monitoring
 */

import { redirect } from 'next/navigation';
import { protectRoute } from '@/lib/server/subscription';
import { AuthError, ForbiddenError } from '@/lib/server/errors';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardAuthProvider } from '@/components/auth/DashboardAuthProviderV2';

// Force Node.js runtime to avoid Edge + Supabase issues
export const runtime = 'nodejs';
// Force dynamic rendering to avoid caching issues with auth
export const dynamic = 'force-dynamic';
// Prevent caching of subscription state
export const revalidate = 0;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Gate: not authenticated -> /login; no active subscription -> /billing
  try {
    // protectRoute() checks:
    // 1. User is authenticated (has valid session)
    // 2. User has active subscription (not expired)
    // 3. User has required tier (defaults to basic/premium)
    await protectRoute(); // Throws if requirements not met
  } catch (err: unknown) {
    // Use instanceof for type-safe error checking
    if (err instanceof AuthError) {
      return redirect('/login');
    }
    if (err instanceof ForbiddenError) {
      return redirect('/billing');
    }
    // Unknown error -> safe fallback to login
    console.error('[DASHBOARD_GATE] Unexpected error:', err);
    return redirect('/login');
  }

  // User has valid session AND active subscription
  // Render dashboard with client-side auth provider
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