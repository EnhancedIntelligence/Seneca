/**
 * Main App Layout
 * Server Component that wraps all memory capture views
 */

import { AppShell } from '@/components/layout/AppShell';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}