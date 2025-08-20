/**
 * Dashboard Layout
 * 
 * Wraps all dashboard routes with authentication protection.
 * Uses server-side initial check + client-side auth provider for:
 * - Session verification without middleware
 * - Automatic redirect to login if not authenticated
 * - Real-time session monitoring
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardAuthProvider } from '@/components/auth/DashboardAuthProviderV2';

// Force Node.js runtime to avoid Edge + Supabase issues
export const runtime = 'nodejs';
// Force dynamic rendering to avoid caching issues with auth
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth check for initial page load
  // This prevents unauthenticated users from even loading the page
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  // No session on server = redirect to login immediately
  if (!session || error) {
    redirect('/login');
  }

  // User has valid session, render dashboard with client-side auth provider
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